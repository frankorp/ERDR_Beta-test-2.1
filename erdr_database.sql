-- ============================================
-- БАЗА ДАНИХ ЄРДР (Єдиний реєстр досудових розслідувань)
-- Версія: 2.4.1
-- Автор: Система ЄРДР PRO
-- ============================================

-- Створення бази даних
CREATE DATABASE IF NOT EXISTS `erdr_system` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `erdr_system`;

-- ============================================
-- ТАБЛИЦІ СИСТЕМИ
-- ============================================

-- Таблиця відомств
CREATE TABLE `agencies` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `code` VARCHAR(10) UNIQUE NOT NULL COMMENT 'Код відомства (gunp, sbu, prosecutor)',
    `name` VARCHAR(100) NOT NULL COMMENT 'Повна назва',
    `short_name` VARCHAR(50) NOT NULL COMMENT 'Скорочена назва',
    `description` TEXT COMMENT 'Опис відомства',
    `color` VARCHAR(7) DEFAULT '#0057b7' COMMENT 'Колір відомства в системі',
    `icon` VARCHAR(20) DEFAULT '🏛️' COMMENT 'Іконка відомства',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_agency_code` (`code`),
    INDEX `idx_agency_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця користувачів
CREATE TABLE `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `username` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Логін користувача',
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'Хеш пароля',
    `name` VARCHAR(100) NOT NULL COMMENT 'Повне імʼя',
    `position` VARCHAR(100) NOT NULL COMMENT 'Посада',
    `agency_id` INT NOT NULL COMMENT 'Відомство',
    `role` ENUM('admin', 'director', 'deputy', 'senior', 'investigator', 'operator', 'analyst', 'viewer') DEFAULT 'viewer',
    `email` VARCHAR(100) UNIQUE,
    `phone` VARCHAR(20),
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_login` TIMESTAMP NULL,
    `failed_attempts` INT DEFAULT 0 COMMENT 'Невдалих спроб входу',
    `locked_until` TIMESTAMP NULL COMMENT 'Блокування до...',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_agency` (`agency_id`),
    INDEX `idx_user_role` (`role`),
    INDEX `idx_user_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця справ (основна)
CREATE TABLE `cases` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `case_number` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Унікальний номер справи',
    `title` VARCHAR(255) NOT NULL COMMENT 'Назва справи',
    `description` TEXT COMMENT 'Детальний опис',
    `category_id` INT NOT NULL COMMENT 'Категорія справи',
    `priority` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    `status` ENUM('new', 'in_progress', 'suspended', 'completed', 'closed', 'archived') DEFAULT 'new',
    `agency_id` INT NOT NULL COMMENT 'Відомство, що веде справу',
    `created_by` INT NOT NULL COMMENT 'Хто створив справу',
    `responsible_id` INT NOT NULL COMMENT 'Відповідальна особа',
    `supervisor_id` INT COMMENT 'Керівник/наглядач',
    `created_date` DATE NOT NULL COMMENT 'Дата відкриття справи',
    `due_date` DATE COMMENT 'Плановий термін завершення',
    `actual_end_date` DATE COMMENT 'Фактична дата завершення',
    `confidential_level` ENUM('public', 'internal', 'secret', 'top_secret') DEFAULT 'internal',
    `location` VARCHAR(255) COMMENT 'Місце події/територія',
    `region` VARCHAR(100) COMMENT 'Область',
    `city` VARCHAR(100) COMMENT 'Місто',
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `deleted_at` TIMESTAMP NULL,
    `deleted_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`responsible_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`supervisor_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`),
    INDEX `idx_case_number` (`case_number`),
    INDEX `idx_case_agency` (`agency_id`),
    INDEX `idx_case_status` (`status`),
    INDEX `idx_case_priority` (`priority`),
    INDEX `idx_case_created` (`created_date`),
    INDEX `idx_case_responsible` (`responsible_id`),
    INDEX `idx_case_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця категорій справ
CREATE TABLE `case_categories` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT 'Назва категорії',
    `description` TEXT,
    `agency_id` INT COMMENT 'NULL = загальні категорії',
    `color` VARCHAR(7) DEFAULT '#6b7280',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL,
    INDEX `idx_category_agency` (`agency_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця учасників справи
CREATE TABLE `case_participants` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `case_id` INT NOT NULL,
    `user_id` INT NOT NULL COMMENT 'Співробітник, прикріплений до справи',
    `role` ENUM('investigator', 'assistant', 'expert', 'reviewer', 'prosecutor', 'witness') NOT NULL,
    `assigned_date` DATE NOT NULL,
    `removed_date` DATE NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    UNIQUE KEY `unique_case_user_active` (`case_id`, `user_id`, `is_active`),
    INDEX `idx_participant_case` (`case_id`),
    INDEX `idx_participant_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця подій/дій по справі
CREATE TABLE `case_actions` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `case_id` INT NOT NULL,
    `user_id` INT NOT NULL COMMENT 'Хто виконав дію',
    `action_type` ENUM('create', 'update', 'status_change', 'assign', 'comment', 'document_add', 'meeting', 'investigation', 'hearing', 'other') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `action_date` DATETIME NOT NULL COMMENT 'Дата виконання дії',
    `due_date` DATE COMMENT 'Плановий термін наступної дії',
    `is_completed` BOOLEAN DEFAULT FALSE,
    `completed_date` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    INDEX `idx_action_case` (`case_id`),
    INDEX `idx_action_user` (`user_id`),
    INDEX `idx_action_date` (`action_date`),
    INDEX `idx_action_completed` (`is_completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця документів
CREATE TABLE `documents` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `case_id` INT NOT NULL,
    `document_number` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `document_type` ENUM('indictment', 'protocol', 'expertise', 'decision', 'order', 'report', 'evidence', 'other') NOT NULL,
    `file_path` VARCHAR(500) COMMENT 'Шлях до файлу',
    `file_size` BIGINT COMMENT 'Розмір файлу в байтах',
    `mime_type` VARCHAR(100),
    `created_by` INT NOT NULL,
    `confidential_level` ENUM('public', 'internal', 'secret', 'top_secret') DEFAULT 'internal',
    `created_date` DATE NOT NULL,
    `is_signed` BOOLEAN DEFAULT FALSE,
    `signed_date` DATE NULL,
    `signed_by` INT NULL,
    `is_deleted` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`signed_by`) REFERENCES `users`(`id`),
    INDEX `idx_document_case` (`case_id`),
    INDEX `idx_document_type` (`document_type`),
    INDEX `idx_document_number` (`document_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця системних логів
CREATE TABLE `system_logs` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
    `log_type` ENUM('login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'system', 'error', 'security') NOT NULL,
    `action` VARCHAR(255) NOT NULL COMMENT 'Опис дії',
    `details` JSON COMMENT 'Детальна інформація у форматі JSON',
    `user_id` INT NULL COMMENT 'Користувач, який виконав дію',
    `agency_id` INT NULL COMMENT 'Відомство',
    `ip_address` VARCHAR(45) COMMENT 'IP-адреса',
    `user_agent` TEXT COMMENT 'User-Agent браузера',
    `session_id` VARCHAR(100),
    `severity` ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL,
    INDEX `idx_log_type` (`log_type`),
    INDEX `idx_log_user` (`user_id`),
    INDEX `idx_log_agency` (`agency_id`),
    INDEX `idx_log_created` (`created_at`),
    INDEX `idx_log_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця сповіщень
CREATE TABLE `notifications` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL COMMENT 'Отримувач',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `notification_type` ENUM('info', 'warning', 'danger', 'success', 'system') DEFAULT 'info',
    `related_case_id` INT NULL,
    `related_document_id` INT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `read_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`related_case_id`) REFERENCES `cases`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`related_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL,
    INDEX `idx_notification_user` (`user_id`),
    INDEX `idx_notification_read` (`is_read`),
    INDEX `idx_notification_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця налаштувань системи
CREATE TABLE `system_settings` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `setting_key` VARCHAR(100) UNIQUE NOT NULL,
    `setting_value` TEXT,
    `description` VARCHAR(255),
    `category` VARCHAR(50) DEFAULT 'general',
    `is_public` BOOLEAN DEFAULT FALSE COMMENT 'Доступно без авторизації',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_setting_key` (`setting_key`),
    INDEX `idx_setting_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця статистики
CREATE TABLE `statistics` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `agency_id` INT NULL,
    `stat_date` DATE NOT NULL COMMENT 'Дата статистики',
    `stat_type` VARCHAR(50) NOT NULL COMMENT 'Тип статистики',
    `stat_value` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_stat_record` (`agency_id`, `stat_date`, `stat_type`),
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE,
    INDEX `idx_stat_date` (`stat_date`),
    INDEX `idx_stat_type` (`stat_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ТРИГЕРИ ТА ПРОЦЕДУРИ
-- ============================================

-- Тригер для автоматичного створення логу при зміні статусу справи
DELIMITER $$
CREATE TRIGGER `after_case_status_update`
AFTER UPDATE ON `cases`
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO `system_logs` (
            `log_type`, 
            `action`, 
            `details`, 
            `user_id`, 
            `agency_id`,
            `ip_address`
        ) VALUES (
            'update',
            CONCAT('Зміна статусу справи: ', OLD.status, ' → ', NEW.status),
            JSON_OBJECT(
                'case_number', OLD.case_number,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'case_title', OLD.title
            ),
            NEW.responsible_id,
            NEW.agency_id,
            'system'
        );
    END IF;
END$$
DELIMITER ;

-- Тригер для автоматичного додавання створювача справи як учасника
DELIMITER $$
CREATE TRIGGER `after_case_insert`
AFTER INSERT ON `cases`
FOR EACH ROW
BEGIN
    -- Додаємо створювача справи як учасника
    INSERT INTO `case_participants` (
        `case_id`,
        `user_id`,
        `role`,
        `assigned_date`,
        `is_active`
    ) VALUES (
        NEW.id,
        NEW.created_by,
        'investigator',
        NEW.created_date,
        TRUE
    );
    
    -- Додаємо відповідального як учасника
    IF NEW.responsible_id != NEW.created_by THEN
        INSERT INTO `case_participants` (
            `case_id`,
            `user_id`,
            `role`,
            `assigned_date`,
            `is_active`
        ) VALUES (
            NEW.id,
            NEW.responsible_id,
            'investigator',
            NEW.created_date,
            TRUE
        );
    END IF;
    
    -- Логуємо створення справи
    INSERT INTO `system_logs` (
        `log_type`, 
        `action`, 
        `details`, 
        `user_id`, 
        `agency_id`,
        `ip_address`
    ) VALUES (
        'create',
        'Створення нової справи',
        JSON_OBJECT(
            'case_number', NEW.case_number,
            'case_title', NEW.title,
            'priority', NEW.priority,
            'category_id', NEW.category_id
        ),
        NEW.created_by,
        NEW.agency_id,
        'system'
    );
    
    -- Оновлюємо статистику
    CALL update_daily_statistics(NEW.agency_id, NEW.created_date);
END$$
DELIMITER ;

-- Процедура для оновлення статистики
DELIMITER $$
CREATE PROCEDURE `update_daily_statistics`(
    IN p_agency_id INT,
    IN p_stat_date DATE
)
BEGIN
    -- Загальна кількість справ
    INSERT INTO `statistics` (`agency_id`, `stat_date`, `stat_type`, `stat_value`)
    SELECT 
        p_agency_id,
        p_stat_date,
        'total_cases',
        COUNT(*)
    FROM `cases` 
    WHERE `agency_id` = p_agency_id 
        AND `is_deleted` = FALSE
    ON DUPLICATE KEY UPDATE `stat_value` = VALUES(`stat_value`);
    
    -- Активні справи
    INSERT INTO `statistics` (`agency_id`, `stat_date`, `stat_type`, `stat_value`)
    SELECT 
        p_agency_id,
        p_stat_date,
        'active_cases',
        COUNT(*)
    FROM `cases` 
    WHERE `agency_id` = p_agency_id 
        AND `is_deleted` = FALSE
        AND `status` IN ('new', 'in_progress')
    ON DUPLICATE KEY UPDATE `stat_value` = VALUES(`stat_value`);
    
    -- Критичні справи
    INSERT INTO `statistics` (`agency_id`, `stat_date`, `stat_type`, `stat_value`)
    SELECT 
        p_agency_id,
        p_stat_date,
        'critical_cases',
        COUNT(*)
    FROM `cases` 
    WHERE `agency_id` = p_agency_id 
        AND `is_deleted` = FALSE
        AND `priority` = 'critical'
    ON DUPLICATE KEY UPDATE `stat_value` = VALUES(`stat_value`);
END$$
DELIMITER ;

-- Процедура для отримання звіту по відомству
DELIMITER $$
CREATE PROCEDURE `get_agency_report`(
    IN p_agency_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        c.`case_number`,
        c.`title`,
        cc.`name` as `category`,
        c.`priority`,
        c.`status`,
        c.`created_date`,
        u.`name` as `responsible`,
        COUNT(DISTINCT cp.`id`) as `participants_count`,
        COUNT(DISTINCT d.`id`) as `documents_count`
    FROM `cases` c
    LEFT JOIN `case_categories` cc ON c.`category_id` = cc.`id`
    LEFT JOIN `users` u ON c.`responsible_id` = u.`id`
    LEFT JOIN `case_participants` cp ON c.`id` = cp.`case_id` AND cp.`is_active` = TRUE
    LEFT JOIN `documents` d ON c.`id` = d.`case_id` AND d.`is_deleted` = FALSE
    WHERE c.`agency_id` = p_agency_id
        AND c.`is_deleted` = FALSE
        AND c.`created_date` BETWEEN p_start_date AND p_end_date
    GROUP BY c.`id`
    ORDER BY c.`created_date` DESC, c.`priority` DESC;
END$$
DELIMITER ;

-- ============================================
-- ПОЧАТКОВІ ДАНІ
-- ============================================

-- Додаємо відомства
INSERT INTO `agencies` (`code`, `name`, `short_name`, `description`, `color`, `icon`) VALUES
('gunp', 'Головне управління Національної поліції України', 'ГУНП', 'Головний орган поліції України', '#1e40af', '👮‍♂️'),
('sbu', 'Служба Безпеки України', 'СБУ', 'Спеціальна служба безпеки та контррозвідки', '#dc2626', '🕵️‍♂️'),
('prosecutor', 'Генеральна прокуратура України', 'Прокуратура', 'Наглядова та слідча прокуратура', '#7c2d12', '⚖️'),
('admin', 'Система ЄРДР', 'Адміністрація', 'Адміністрація системи ЄРДР', '#7e22ce', '👨‍💼');

-- Додаємо категорії справ
INSERT INTO `case_categories` (`name`, `description`, `agency_id`, `color`) VALUES
-- Загальні категорії (NULL agency_id)
('Кримінальні справи', 'Загальні кримінальні правопорушення', NULL, '#ef4444'),
('Економічні справи', 'Правопорушення в економічній сфері', NULL, '#f59e0b'),
('Корупційні справи', 'Корупційні злочини та зловживання', NULL, '#8b5cf6'),
('Адміністративні справи', 'Адміністративні правопорушення', NULL, '#10b981'),

-- Категорії ГУНП
('Вбивства', 'Розслідування вбивств', 1, '#dc2626'),
('Крадіжки', 'Розслідування крадіжок та грабежів', 1, '#ea580c'),
('Наркотики', 'Справи про наркотичні речовини', 1, '#7c3aed'),

-- Категорії СБУ
('Контррозвідка', 'Контррозвідувальні заходи', 2, '#b91c1c'),
('Кібербезпека', 'Кіберзлочини та кібербезпека', 2, '#0d9488'),
('Тероризм', 'Боротьба з тероризмом', 2, '#7f1d1d'),

-- Категорії Прокуратури
('Нагляд', 'Нагляд за дотриманням закону', 3, '#854d0e'),
('Апеляції', 'Апеляційні справи', 3, '#3f6212'),
('Міжнародні', 'Міжнародне співробітництво', 3, '#1e40af');

-- Додаємо тестових користувачів (паролі: відповідні зі списку)
INSERT INTO `users` (`username`, `password_hash`, `name`, `position`, `agency_id`, `role`, `email`) VALUES
-- ГУНП користувачі
('gunp_admin', '$2y$10$YourHashHere1', 'Коваленко І.П.', 'Головний адміністратор ГУНП', 1, 'admin', 'gunp.admin@erdr.gov.ua'),
('gunp_director', '$2y$10$YourHashHere2', 'Петренко О.В.', 'Начальник управління', 1, 'director', 'gunp.director@erdr.gov.ua'),
('gunp_senior', '$2y$10$YourHashHere3', 'Бондаренко С.П.', 'Старший слідчий', 1, 'senior', 'gunp.senior@erdr.gov.ua'),
('gunp_invest', '$2y$10$YourHashHere4', 'Сидоренко В.П.', 'Слідчий', 1, 'investigator', 'gunp.invest@erdr.gov.ua'),

-- СБУ користувачі
('sbu_admin', '$2y$10$YourHashHere5', 'Мельник А.В.', 'Головний адміністратор СБУ', 2, 'admin', 'sbu.admin@erdr.gov.ua'),
('sbu_counter', '$2y$10$YourHashHere6', 'Ковальчук С.М.', 'Начальник контррозвідки', 2, 'director', 'sbu.counter@erdr.gov.ua'),
('sbu_cyber', '$2y$10$YourHashHere7', 'Шевчук М.С.', 'Кіберспеціаліст', 2, 'analyst', 'sbu.cyber@erdr.gov.ua'),

-- Прокуратура користувачі
('proc_admin', '$2y$10$YourHashHere8', 'Віскар М.М.', 'Головний адміністратор Прокуратури', 3, 'admin', 'proc.admin@erdr.gov.ua'),
('proc_general', '$2y$10$YourHashHere9', 'Кулебяка А.А.', 'Генеральний прокурор', 3, 'director', 'proc.general@erdr.gov.ua'),
('proc_senior', '$2y$10$YourHashHere10', 'Шмелев А.Є.', 'Старший прокурор', 3, 'senior', 'proc.senior@erdr.gov.ua'),

-- Системний адміністратор
('system_admin', '$2y$10$YourHashHere11', 'Системний адміністратор', 'Головний адміністратор', 4, 'admin', 'system.admin@erdr.gov.ua');

-- Додаємо тестові справи
INSERT INTO `cases` (
    `case_number`, 
    `title`, 
    `description`, 
    `category_id`, 
    `priority`, 
    `status`, 
    `agency_id`, 
    `created_by`, 
    `responsible_id`,
    `created_date`,
    `location`,
    `region`
) VALUES
('210/2024', 'Розкрадання коштів бюджету', 'Справа про розкрадання коштів місцевого бюджету міста Києва', 1, 'high', 'in_progress', 1, 1, 2, '2024-01-15', 'Київ', 'м. Київ'),
('СБУ-45/2024', 'Контррозвідувальна операція', 'Операція з виявлення іноземних агентів у державних установах', 8, 'critical', 'in_progress', 2, 5, 6, '2024-01-14', 'Київська область', 'Київська'),
('П-789/2024', 'Нагляд за розслідуванням', 'Нагляд за дотриманням закону при розслідуванні кримінальної справи', 10, 'medium', 'new', 3, 8, 9, '2024-01-16', 'Львів', 'Львівська'),
('ГУНП-123/2024', 'Вбивство у центрі міста', 'Розслідування вбивства комерсанта у центрі Києва', 5, 'high', 'in_progress', 1, 2, 3, '2024-01-10', 'Київ', 'м. Київ'),
('КІБЕР-01/2024', 'Хакерська атака на банк', 'Кібератака на систему державного банку', 9, 'critical', 'new', 2, 6, 7, '2024-01-17', 'Одеса', 'Одеська');

-- Додаємо системні налаштування
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `category`, `is_public`) VALUES
('system_version', '2.4.1', 'Версія системи ЄРДР', 'system', TRUE),
('system_name', 'ЄРДР PRO', 'Назва системи', 'system', TRUE),
('maintenance_mode', '0', 'Режим обслуговування', 'system', TRUE),
('session_timeout', '3600', 'Таймаут сесії в секундах', 'security', FALSE),
('max_login_attempts', '5', 'Максимальна кількість спроб входу', 'security', FALSE),
('password_expiry_days', '90', 'Термін дії пароля', 'security', FALSE),
('default_language', 'uk', 'Мова за замовчуванням', 'ui', TRUE),
('date_format', 'dd.mm.yyyy', 'Формат дати', 'ui', TRUE),
('records_per_page', '20', 'Кількість записів на сторінку', 'ui', TRUE),
('enable_audit_log', '1', 'Включити систему аудиту', 'audit', FALSE);

-- ============================================
-- ІНДЕКСИ ТА ОПТИМІЗАЦІЯ
-- ============================================

-- Додаткові індекси для оптимізації
CREATE INDEX `idx_cases_full_search` ON `cases` (`case_number`, `title`, `status`, `priority`);
CREATE INDEX `idx_logs_full_search` ON `system_logs` (`log_type`, `user_id`, `created_at`);
CREATE INDEX `idx_users_search` ON `users` (`username`, `name`, `position`);

-- ============================================
-- ПРАВА ДОСТУПУ
-- ============================================

-- Створення користувача для додатка
CREATE USER IF NOT EXISTS 'erdr_app'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON `erdr_system`.* TO 'erdr_app'@'localhost';
FLUSH PRIVILEGES;

-- ============================================
-- PHP КЛАС ДЛЯ РОБОТИ З БАЗОЮ
-- ============================================
