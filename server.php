<?php
// server.php - REST API сервер для ЄРДР системы

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Конфигурация
define('DB_FILE', 'erdr_database.db');
define('SECRET_KEY', 'erdr_secret_key_2024');

// Подключение к базе данных SQLite
class Database {
    private $pdo;
    
    public function __construct() {
        try {
            $this->pdo = new PDO('sqlite:' . DB_FILE);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            $this->initDatabase();
        } catch (PDOException $e) {
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    
    private function initDatabase() {
        // Создание таблицы пользователей
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                position TEXT NOT NULL,
                agency TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // Создание таблицы дел
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'new',
                agency TEXT NOT NULL,
                created_by INTEGER NOT NULL,
                responsible TEXT NOT NULL,
                created_date TEXT NOT NULL,
                location TEXT,
                region TEXT,
                is_deleted INTEGER DEFAULT 0,
                deleted_at TEXT,
                deleted_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        ");
        
        // Создание таблицы логов
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_type TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                user_id INTEGER,
                username TEXT,
                agency TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ");
        
        // Создание индексов
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_cases_agency ON cases(agency)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_logs_type ON system_logs(log_type)");
        
        // Создание тестовых пользователей, если их нет
        $this->createInitialUsers();
    }
    
    private function createInitialUsers() {
        $users = [
            // ГУНП пользователи
            ['gunp_admin', password_hash('BlueDragon2024', PASSWORD_DEFAULT), 'Коваленко І.П.', 'Головний адміністратор ГУНП', 'gunp', 'admin'],
            ['gunp_director', password_hash('PoliceGuard987', PASSWORD_DEFAULT), 'Петренко О.В.', 'Начальник управління', 'gunp', 'director'],
            ['gunp_senior', password_hash('Investigator777', PASSWORD_DEFAULT), 'Бондаренко С.П.', 'Старший слідчий', 'gunp', 'senior'],
            ['gunp_invest', password_hash('CrimeHunter333', PASSWORD_DEFAULT), 'Сидоренко В.П.', 'Слідчий', 'gunp', 'investigator'],
            
            // СБУ пользователи
            ['sbu_admin', password_hash('RedShadow2024', PASSWORD_DEFAULT), 'Мельник А.В.', 'Головний адміністратор СБУ', 'sbu', 'admin'],
            ['sbu_counter', password_hash('CounterSpy789', PASSWORD_DEFAULT), 'Ковальчук С.М.', 'Начальник контррозвідки', 'sbu', 'director'],
            ['sbu_cyber', password_hash('CyberShield321', PASSWORD_DEFAULT), 'Шевчук М.С.', 'Кіберспеціаліст', 'sbu', 'analyst'],
            
            // Прокуратура пользователи
            ['proc_admin', password_hash('GoldScale2024', PASSWORD_DEFAULT), 'Віскар М.М.', 'Головний адміністратор Прокуратури', 'prosecutor', 'admin'],
            ['proc_general', password_hash('JusticeLord777', PASSWORD_DEFAULT), 'Кулебяка А.А.', 'Генеральний прокурор', 'prosecutor', 'director'],
            
            // Администратор
            ['system_admin', password_hash('MasterControl2024', PASSWORD_DEFAULT), 'Системний адміністратор', 'Головний адміністратор', 'admin', 'admin']
        ];
        
        foreach ($users as $user) {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$user[0]]);
            if (!$stmt->fetch()) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO users (username, password_hash, name, position, agency, role)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute($user);
            }
        }
    }
    
    public function getPDO() {
        return $this->pdo;
    }
}

// Инициализация базы данных
$db = new Database();
$pdo = $db->getPDO();

// Получение данных запроса
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/server.php', '', $path);
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

// Аутентификация пользователя
function authenticate($username, $password) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password_hash'])) {
        unset($user['password_hash']);
        return $user;
    }
    
    return false;
}

// Логирование действий
function logAction($type, $action, $details = [], $user = null) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        INSERT INTO system_logs (log_type, action, details, user_id, username, agency, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $type,
        $action,
        json_encode($details, JSON_UNESCAPED_UNICODE),
        $user['id'] ?? null,
        $user['username'] ?? null,
        $user['agency'] ?? null,
        $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
}

// Маршрутизация
switch ($path) {
    case '/api/login':
        if ($method === 'POST') {
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            
            $user = authenticate($username, $password);
            
            if ($user) {
                logAction('login', 'Успішний вхід в систему', [
                    'username' => $username,
                    'agency' => $user['agency']
                ], $user);
                
                echo json_encode([
                    'success' => true,
                    'user' => $user,
                    'message' => 'Успішний вхід'
                ]);
            } else {
                logAction('login', 'Невдала спроба входу', [
                    'username' => $username,
                    'status' => 'failed'
                ]);
                
                echo json_encode([
                    'success' => false,
                    'message' => 'Невірний логін або пароль'
                ]);
            }
        }
        break;
        
    case '/api/cases':
        if ($method === 'GET') {
            // Получение списка дел
            $agency = $_GET['agency'] ?? '';
            $status = $_GET['status'] ?? '';
            $search = $_GET['search'] ?? '';
            
            $where = ['is_deleted = 0'];
            $params = [];
            
            if ($agency) {
                $where[] = 'agency = ?';
                $params[] = $agency;
            }
            
            if ($status) {
                $where[] = 'status = ?';
                $params[] = $status;
            }
            
            if ($search) {
                $where[] = '(case_number LIKE ? OR title LIKE ?)';
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
            
            $stmt = $pdo->prepare("
                SELECT c.*, u.name as created_by_name 
                FROM cases c
                LEFT JOIN users u ON c.created_by = u.id
                $whereClause
                ORDER BY created_date DESC
            ");
            
            $stmt->execute($params);
            $cases = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'cases' => $cases,
                'count' => count($cases)
            ]);
            
        } elseif ($method === 'POST') {
            // Создание нового дела
            $auth = $input['auth'] ?? [];
            $user = authenticate($auth['username'] ?? '', $auth['password'] ?? '');
            
            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'Необхідна авторизація']);
                break;
            }
            
            $caseData = $input['case'] ?? [];
            
            // Проверка обязательных полей
            if (empty($caseData['case_number']) || empty($caseData['title'])) {
                echo json_encode(['success' => false, 'message' => 'Заповніть обов\'язкові поля']);
                break;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO cases (
                    case_number, title, description, category, priority, status,
                    agency, created_by, responsible, created_date, location, region
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $success = $stmt->execute([
                $caseData['case_number'],
                $caseData['title'],
                $caseData['description'] ?? '',
                $caseData['category'] ?? 'criminal',
                $caseData['priority'] ?? 'medium',
                $caseData['status'] ?? 'new',
                $user['agency'],
                $user['id'],
                $user['name'],
                $caseData['created_date'] ?? date('Y-m-d'),
                $caseData['location'] ?? '',
                $caseData['region'] ?? ''
            ]);
            
            if ($success) {
                $caseId = $pdo->lastInsertId();
                
                logAction('create', 'Створення нової справи', [
                    'case_number' => $caseData['case_number'],
                    'case_title' => $caseData['title'],
                    'case_id' => $caseId
                ], $user);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Справу успішно створено',
                    'case_id' => $caseId
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Помилка створення справи']);
            }
        }
        break;
        
    case '/api/cases/delete':
        if ($method === 'POST') {
            $auth = $input['auth'] ?? [];
            $caseId = $input['case_id'] ?? 0;
            
            // Только прокуроры могут удалять дела
            $user = authenticate($auth['username'] ?? '', $auth['password'] ?? '');
            
            if (!$user || $user['agency'] !== 'prosecutor') {
                echo json_encode(['success' => false, 'message' => 'Недостатньо прав для видалення']);
                break;
            }
            
            // Получаем информацию о деле
            $stmt = $pdo->prepare("SELECT * FROM cases WHERE id = ? AND is_deleted = 0");
            $stmt->execute([$caseId]);
            $case = $stmt->fetch();
            
            if (!$case) {
                echo json_encode(['success' => false, 'message' => 'Справа не знайдена']);
                break;
            }
            
            // Мягкое удаление
            $stmt = $pdo->prepare("
                UPDATE cases 
                SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
                WHERE id = ?
            ");
            
            $success = $stmt->execute([$user['id'], $caseId]);
            
            if ($success) {
                logAction('delete', 'Видалення справи', [
                    'case_number' => $case['case_number'],
                    'case_title' => $case['title'],
                    'confirmed_by' => $user['name']
                ], $user);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Справу успішно видалено'
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Помилка видалення']);
            }
        }
        break;
        
    case '/api/logs':
        if ($method === 'GET') {
            $limit = $_GET['limit'] ?? 100;
            $type = $_GET['type'] ?? '';
            
            $where = [];
            $params = [];
            
            if ($type) {
                $where[] = 'log_type = ?';
                $params[] = $type;
            }
            
            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
            
            $stmt = $pdo->prepare("
                SELECT * FROM system_logs 
                $whereClause
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            
            $params[] = $limit;
            $stmt->execute($params);
            $logs = $stmt->fetchAll();
            
            // Декодируем JSON детали
            foreach ($logs as &$log) {
                $log['details'] = json_decode($log['details'], true) ?? [];
            }
            
            echo json_encode([
                'success' => true,
                'logs' => $logs,
                'count' => count($logs)
            ]);
        }
        break;
        
    case '/api/stats':
        if ($method === 'GET') {
            $agency = $_GET['agency'] ?? '';
            
            $where = ['is_deleted = 0'];
            $params = [];
            
            if ($agency) {
                $where[] = 'agency = ?';
                $params[] = $agency;
            }
            
            $whereClause = 'WHERE ' . implode(' AND ', $where);
            
            // Общая статистика
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_cases,
                    SUM(CASE WHEN status IN ('new', 'in-progress') THEN 1 ELSE 0 END) as active_cases,
                    SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical_cases
                FROM cases 
                $whereClause
            ");
            
            $stmt->execute($params);
            $stats = $stmt->fetch();
            
            // Статистика по статусам
            $stmt = $pdo->prepare("
                SELECT status, COUNT(*) as count
                FROM cases 
                $whereClause
                GROUP BY status
            ");
            
            $stmt->execute($params);
            $statusStats = $stmt->fetchAll();
            
            // Статистика по категориям
            $stmt = $pdo->prepare("
                SELECT category, COUNT(*) as count
                FROM cases 
                $whereClause
                GROUP BY category
            ");
            
            $stmt->execute($params);
            $categoryStats = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'stats' => $stats,
                'status_stats' => $statusStats,
                'category_stats' => $categoryStats
            ]);
        }
        break;
        
    case '/api/export':
        if ($method === 'GET') {
            $agency = $_GET['agency'] ?? '';
            $format = $_GET['format'] ?? 'csv';
            
            $where = ['is_deleted = 0'];
            $params = [];
            
            if ($agency) {
                $where[] = 'agency = ?';
                $params[] = $agency;
            }
            
            $whereClause = 'WHERE ' . implode(' AND ', $where);
            
            $stmt = $pdo->prepare("
                SELECT c.*, u.name as created_by_name 
                FROM cases c
                LEFT JOIN users u ON c.created_by = u.id
                $whereClause
                ORDER BY created_date DESC
            ");
            
            $stmt->execute($params);
            $cases = $stmt->fetchAll();
            
            if ($format === 'csv') {
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename=erdr_cases_' . date('Y-m-d') . '.csv');
                
                $output = fopen('php://output', 'w');
                fputcsv($output, ['Номер', 'Назва', 'Категорія', 'Статус', 'Пріоритет', 'Дата', 'Відомство', 'Відповідальний']);
                
                foreach ($cases as $case) {
                    fputcsv($output, [
                        $case['case_number'],
                        $case['title'],
                        $case['category'],
                        $case['status'],
                        $case['priority'],
                        $case['created_date'],
                        $case['agency'],
                        $case['responsible']
                    ]);
                }
                
                fclose($output);
                exit;
            } else {
                echo json_encode([
                    'success' => true,
                    'cases' => $cases,
                    'count' => count($cases)
                ]);
            }
        }
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'API endpoint not found',
            'available_endpoints' => [
                '/api/login (POST)',
                '/api/cases (GET, POST)',
                '/api/cases/delete (POST)',
                '/api/logs (GET)',
                '/api/stats (GET)',
                '/api/export (GET)'
            ]
        ]);
        break;
}
?>
