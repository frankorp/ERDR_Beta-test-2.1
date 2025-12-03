<?php
// config.php - Конфігурація системи ЄРДР

// Налаштування бази даних
define('DB_HOST', 'localhost');
define('DB_NAME', 'erdr_system');
define('DB_USER', 'erdr_app');
define('DB_PASS', 'SecurePassword123!');
define('DB_CHARSET', 'utf8mb4');

// Налаштування сесії
define('SESSION_NAME', 'ERDR_SESSION');
define('SESSION_TIMEOUT', 3600); // 1 година

// Налаштування безпеки
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_TIME', 1800); // 30 хвилин у секундах
define('PASSWORD_MIN_LENGTH', 8);

// Шляхи
define('BASE_URL', 'http://localhost/erdr/');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('LOG_DIR', __DIR__ . '/logs/');

// Системні налаштування
define('SYSTEM_VERSION', '2.4.1');
define('SYSTEM_NAME', 'ЄРДР PRO');
define('MAINTENANCE_MODE', false);

// Налаштування мови
define('DEFAULT_LANGUAGE', 'uk');
$supportedLanguages = ['uk', 'en'];

// Налаштування пагінації
define('RECORDS_PER_PAGE', 20);
define('MAX_EXPORT_RECORDS', 1000);

// Налаштування електронної пошти
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'noreply@erdr.gov.ua');
define('SMTP_PASS', '');
define('SMTP_SECURE', 'tls');

// Включити режим налагодження
define('DEBUG_MODE', true);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Автозавантаження класів
spl_autoload_register(function ($class) {
    $file = __DIR__ . '/classes/' . $class . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Ініціалізація сесії
session_name(SESSION_NAME);
session_start();

// Перевірка режиму обслуговування
if (MAINTENANCE_MODE && !isset($_SESSION['admin'])) {
    header('HTTP/1.1 503 Service Unavailable');
    include(__DIR__ . '/maintenance.html');
    exit;
}

// Захист від XSS
function cleanInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

// Генерація токена CSRF
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// Перевірка токена CSRF
function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Функція для логування помилок
function logError($error, $file = '', $line = '') {
    $logMessage = date('Y-m-d H:i:s') . " | ";
    $logMessage .= "File: {$file} | Line: {$line} | ";
    $logMessage .= "Error: {$error}\n";
    
    if (defined('LOG_DIR') && is_writable(LOG_DIR)) {
        file_put_contents(LOG_DIR . 'errors.log', $logMessage, FILE_APPEND);
    }
    
    if (DEBUG_MODE) {
        error_log($logMessage);
    }
}

// Обробник помилок
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    logError($errstr, $errfile, $errline);
    return true;
});

// Обробник винятків
set_exception_handler(function($exception) {
    logError($exception->getMessage(), $exception->getFile(), $exception->getLine());
    
    if (DEBUG_MODE) {
        echo '<pre>';
        echo 'Exception: ' . $exception->getMessage() . "\n";
        echo 'File: ' . $exception->getFile() . "\n";
        echo 'Line: ' . $exception->getLine() . "\n";
        echo '</pre>';
    } else {
        header('HTTP/1.1 500 Internal Server Error');
        echo 'Сталася помилка. Будь ласка, спробуйте пізніше.';
    }
    exit;
});

// Функція для отримання поточного агентства
function getCurrentAgency() {
    if (isset($_SESSION['user']['agency_code'])) {
        return $_SESSION['user']['agency_code'];
    }
    return null;
}

// Функція для перевірки прав доступу
function checkPermission($requiredRole) {
    if (!isset($_SESSION['user'])) {
        header('Location: /login.php');
        exit;
    }
    
    $userRole = $_SESSION['user']['role'] ?? 'viewer';
    $roleHierarchy = [
        'viewer' => 1,
        'analyst' => 2,
        'investigator' => 3,
        'operator' => 4,
        'senior' => 5,
        'deputy' => 6,
        'director' => 7,
        'admin' => 8
    ];
    
    if (($roleHierarchy[$userRole] ?? 0) < ($roleHierarchy[$requiredRole] ?? 0)) {
        header('HTTP/1.1 403 Forbidden');
        include(__DIR__ . '/403.html');
        exit;
    }
    
    return true;
}
?>
