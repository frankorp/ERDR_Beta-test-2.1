<?php
// Database.php - Клас для роботи з базою даних ЄРДР

class ERDRDatabase {
    private $connection;
    private $config;
    
    public function __construct($config = null) {
        if ($config === null) {
            $this->config = [
                'host' => 'localhost',
                'username' => 'erdr_app',
                'password' => 'SecurePassword123!',
                'database' => 'erdr_system',
                'charset' => 'utf8mb4'
            ];
        } else {
            $this->config = $config;
        }
        
        $this->connect();
    }
    
    private function connect() {
        try {
            $dsn = "mysql:host={$this->config['host']};dbname={$this->config['database']};charset={$this->config['charset']}";
            $this->connection = new PDO($dsn, $this->config['username'], $this->config['password']);
            $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->connection->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
            // Встановлюємо часовий пояс
            $this->connection->exec("SET time_zone = '+02:00'");
            
        } catch (PDOException $e) {
            die("Помилка підключення до бази даних: " . $e->getMessage());
        }
    }
    
    // 🔐 АВТОРИЗАЦІЯ
    public function authenticateUser($username, $password) {
        try {
            $stmt = $this->connection->prepare("
                SELECT u.*, a.code as agency_code, a.name as agency_name, a.color as agency_color
                FROM users u
                JOIN agencies a ON u.agency_id = a.id
                WHERE u.username = :username 
                    AND u.is_active = 1
            ");
            
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch();
            
            if ($user) {
                // Перевіряємо пароль
                if (password_verify($password, $user['password_hash'])) {
                    // Оновлюємо last_login
                    $this->updateLastLogin($user['id']);
                    
                    // Скидаємо лічильник невдалих спроб
                    $this->resetFailedAttempts($user['id']);
                    
                    return $user;
                } else {
                    // Збільшуємо лічильник невдалих спроб
                    $this->incrementFailedAttempts($user['id']);
                    return false;
                }
            }
            
            return false;
            
        } catch (PDOException $e) {
            error_log("Authentication error: " . $e->getMessage());
            return false;
        }
    }
    
    // 📋 СПРАВИ
    public function getCases($agencyId = null, $filters = [], $page = 1, $perPage = 20) {
        try {
            $where = ["c.is_deleted = 0"];
            $params = [];
            
            if ($agencyId) {
                $where[] = "c.agency_id = :agency_id";
                $params[':agency_id'] = $agencyId;
            }
            
            // Фільтри
            if (!empty($filters['status'])) {
                $where[] = "c.status = :status";
                $params[':status'] = $filters['status'];
            }
            
            if (!empty($filters['priority'])) {
                $where[] = "c.priority = :priority";
                $params[':priority'] = $filters['priority'];
            }
            
            if (!empty($filters['category_id'])) {
                $where[] = "c.category_id = :category_id";
                $params[':category_id'] = $filters['category_id'];
            }
            
            if (!empty($filters['search'])) {
                $where[] = "(c.case_number LIKE :search OR c.title LIKE :search)";
                $params[':search'] = "%{$filters['search']}%";
            }
            
            $whereClause = implode(" AND ", $where);
            $offset = ($page - 1) * $perPage;
            
            $query = "
                SELECT c.*, 
                       cc.name as category_name,
                       u.name as responsible_name,
                       u.position as responsible_position,
                       a.code as agency_code,
                       a.name as agency_name,
                       COUNT(DISTINCT cp.id) as participants_count,
                       COUNT(DISTINCT d.id) as documents_count
                FROM cases c
                LEFT JOIN case_categories cc ON c.category_id = cc.id
                LEFT JOIN users u ON c.responsible_id = u.id
                LEFT JOIN agencies a ON c.agency_id = a.id
                LEFT JOIN case_participants cp ON c.id = cp.case_id AND cp.is_active = 1
                LEFT JOIN documents d ON c.id = d.case_id AND d.is_deleted = 0
                WHERE {$whereClause}
                GROUP BY c.id
                ORDER BY c.created_date DESC
                LIMIT :offset, :per_page
            ";
            
            $stmt = $this->connection->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':per_page', $perPage, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("Get cases error: " . $e->getMessage());
            return [];
        }
    }
    
    public function createCase($caseData) {
        try {
            $this->connection->beginTransaction();
            
            // Створюємо справу
            $stmt = $this->connection->prepare("
                INSERT INTO cases (
                    case_number, title, description, category_id, priority, status,
                    agency_id, created_by, responsible_id, created_date,
                    location, region, city, confidential_level
                ) VALUES (
                    :case_number, :title, :description, :category_id, :priority, :status,
                    :agency_id, :created_by, :responsible_id, :created_date,
                    :location, :region, :city, :confidential_level
                )
            ");
            
            $stmt->execute([
                ':case_number' => $caseData['case_number'],
                ':title' => $caseData['title'],
                ':description' => $caseData['description'],
                ':category_id' => $caseData['category_id'],
                ':priority' => $caseData['priority'],
                ':status' => $caseData['status'] ?? 'new',
                ':agency_id' => $caseData['agency_id'],
                ':created_by' => $caseData['created_by'],
                ':responsible_id' => $caseData['responsible_id'],
                ':created_date' => $caseData['created_date'] ?? date('Y-m-d'),
                ':location' => $caseData['location'] ?? null,
                ':region' => $caseData['region'] ?? null,
                ':city' => $caseData['city'] ?? null,
                ':confidential_level' => $caseData['confidential_level'] ?? 'internal'
            ]);
            
            $caseId = $this->connection->lastInsertId();
            
            // Логуємо дію
            $this->logAction('create', 'create_case', [
                'case_id' => $caseId,
                'case_number' => $caseData['case_number'],
                'title' => $caseData['title']
            ], $caseData['created_by'], $caseData['agency_id']);
            
            $this->connection->commit();
            return $caseId;
            
        } catch (PDOException $e) {
            $this->connection->rollBack();
            error_log("Create case error: " . $e->getMessage());
            return false;
        }
    }
    
    public function deleteCase($caseId, $userId, $prosecutorCredentials) {
        try {
            // Перевіряємо чи є користувач прокурором
            $stmt = $this->connection->prepare("
                SELECT u.* FROM users u
                JOIN agencies a ON u.agency_id = a.id
                WHERE u.id = :user_id 
                    AND a.code = 'prosecutor'
                    AND u.username = :username
            ");
            
            $stmt->execute([
                ':user_id' => $userId,
                ':username' => $prosecutorCredentials['username']
            ]);
            
            $prosecutor = $stmt->fetch();
            
            if (!$prosecutor || !password_verify($prosecutorCredentials['password'], $prosecutor['password_hash'])) {
                return ['success' => false, 'message' => 'Недостатньо прав для видалення'];
            }
            
            // Видаляємо справу (soft delete)
            $stmt = $this->connection->prepare("
                UPDATE cases 
                SET is_deleted = 1, 
                    deleted_at = NOW(), 
                    deleted_by = :deleted_by
                WHERE id = :case_id
            ");
            
            $stmt->execute([
                ':case_id' => $caseId,
                ':deleted_by' => $userId
            ]);
            
            // Логуємо видалення
            $this->logAction('delete', 'delete_case', [
                'case_id' => $caseId,
                'confirmed_by' => $prosecutor['name']
            ], $userId);
            
            return ['success' => true, 'message' => 'Справу успішно видалено'];
            
        } catch (PDOException $e) {
            error_log("Delete case error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Помилка видалення'];
        }
    }
    
    // 📊 СТАТИСТИКА
    public function getAgencyStatistics($agencyId) {
        try {
            $stats = [];
            
            // Загальна статистика
            $query = "
                SELECT 
                    COUNT(*) as total_cases,
                    SUM(CASE WHEN status IN ('new', 'in_progress') THEN 1 ELSE 0 END) as active_cases,
                    SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical_cases
                FROM cases 
                WHERE agency_id = :agency_id AND is_deleted = 0
            ";
            
            $stmt = $this->connection->prepare($query);
            $stmt->execute([':agency_id' => $agencyId]);
            $stats = $stmt->fetch();
            
            // Статистика по категоріях
            $query = "
                SELECT cc.name, COUNT(c.id) as count
                FROM cases c
                JOIN case_categories cc ON c.category_id = cc.id
                WHERE c.agency_id = :agency_id AND c.is_deleted = 0
                GROUP BY cc.id
                ORDER BY count DESC
            ";
            
            $stmt = $this->connection->prepare($query);
            $stmt->execute([':agency_id' => $agencyId]);
            $stats['categories'] = $stmt->fetchAll();
            
            return $stats;
            
        } catch (PDOException $e) {
            error_log("Get statistics error: " . $e->getMessage());
            return [];
        }
    }
    
    // 📝 ЛОГИ
    public function getSystemLogs($filters = [], $limit = 100) {
        try {
            $where = [];
            $params = [];
            
            if (!empty($filters['log_type'])) {
                $where[] = "log_type = :log_type";
                $params[':log_type'] = $filters['log_type'];
            }
            
            if (!empty($filters['user_id'])) {
                $where[] = "user_id = :user_id";
                $params[':user_id'] = $filters['user_id'];
            }
            
            if (!empty($filters['agency_id'])) {
                $where[] = "agency_id = :agency_id";
                $params[':agency_id'] = $filters['agency_id'];
            }
            
            if (!empty($filters['date_from'])) {
                $where[] = "created_at >= :date_from";
                $params[':date_from'] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $where[] = "created_at <= :date_to";
                $params[':date_to'] = $filters['date_to'];
            }
            
            $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
            
            $query = "
                SELECT sl.*, 
                       u.name as user_name,
                       u.username,
                       a.code as agency_code,
                       a.name as agency_name
                FROM system_logs sl
                LEFT JOIN users u ON sl.user_id = u.id
                LEFT JOIN agencies a ON sl.agency_id = a.id
                {$whereClause}
                ORDER BY created_at DESC
                LIMIT :limit
            ";
            
            $stmt = $this->connection->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("Get logs error: " . $e->getMessage());
            return [];
        }
    }
    
    public function logAction($type, $action, $details = [], $userId = null, $agencyId = null) {
        try {
            $stmt = $this->connection->prepare("
                INSERT INTO system_logs (
                    log_type, action, details, user_id, agency_id, ip_address, user_agent
                ) VALUES (
                    :log_type, :action, :details, :user_id, :agency_id, :ip_address, :user_agent
                )
            ");
            
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            
            $stmt->execute([
                ':log_type' => $type,
                ':action' => $action,
                ':details' => json_encode($details, JSON_UNESCAPED_UNICODE),
                ':user_id' => $userId,
                ':agency_id' => $agencyId,
                ':ip_address' => $ip,
                ':user_agent' => $userAgent
            ]);
            
            return $this->connection->lastInsertId();
            
        } catch (PDOException $e) {
            error_log("Log action error: " . $e->getMessage());
            return false;
        }
    }
    
    // 🔧 СЛУЖБОВІ ФУНКЦІЇ
    private function updateLastLogin($userId) {
        $stmt = $this->connection->prepare("
            UPDATE users SET last_login = NOW() WHERE id = :id
        ");
        return $stmt->execute([':id' => $userId]);
    }
    
    private function incrementFailedAttempts($userId) {
        $stmt = $this->connection->prepare("
            UPDATE users 
            SET failed_attempts = failed_attempts + 1,
                locked_until = CASE 
                    WHEN failed_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 30 MINUTE)
                    ELSE locked_until 
                END
            WHERE id = :id
        ");
        return $stmt->execute([':id' => $userId]);
    }
    
    private function resetFailedAttempts($userId) {
        $stmt = $this->connection->prepare("
            UPDATE users 
            SET failed_attempts = 0, locked_until = NULL 
            WHERE id = :id
        ");
        return $stmt->execute([':id' => $userId]);
    }
    
    public function getAgencies() {
        $stmt = $this->connection->query("
            SELECT * FROM agencies WHERE is_active = 1 ORDER BY id
        ");
        return $stmt->fetchAll();
    }
    
    public function getCaseCategories($agencyId = null) {
        $where = $agencyId ? "WHERE agency_id = :agency_id OR agency_id IS NULL" : "";
        $params = $agencyId ? [':agency_id' => $agencyId] : [];
        
        $stmt = $this->connection->prepare("
            SELECT * FROM case_categories 
            WHERE is_active = 1 AND (agency_id = :agency_id OR agency_id IS NULL)
            ORDER BY agency_id IS NULL, name
        ");
        
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    public function __destruct() {
        $this->connection = null;
    }
}

// 📦 ФУНКЦІЇ ЕКСПОРТУ
function exportToCSV($data, $filename) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    
    if (!empty($data)) {
        // Заголовки
        fputcsv($output, array_keys($data[0]), ';');
        
        // Дані
        foreach ($data as $row) {
            fputcsv($output, $row, ';');
        }
    }
    
    fclose($output);
    exit;
}
?>
