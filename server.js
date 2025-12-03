// server.js - Node.js сервер для ЄРДР

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Подключение к базе данных
const db = new sqlite3.Database('erdr_database.db');

// Инициализация базы данных
db.serialize(() => {
    // Таблица пользователей
    db.run(`
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
    `);
    
    // Таблица дел
    db.run(`
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
    `);
    
    // Таблица логов
    db.run(`
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
    `);
    
    // Создание тестовых пользователей
    createInitialUsers();
});

function createInitialUsers() {
    const users = [
        // ГУНП
        ['gunp_admin', 'BlueDragon2024', 'Коваленко І.П.', 'Головний адміністратор ГУНП', 'gunp', 'admin'],
        ['gunp_director', 'PoliceGuard987', 'Петренко О.В.', 'Начальник управління', 'gunp', 'director'],
        // СБУ
        ['sbu_admin', 'RedShadow2024', 'Мельник А.В.', 'Головний адміністратор СБУ', 'sbu', 'admin'],
        ['sbu_counter', 'CounterSpy789', 'Ковальчук С.М.', 'Начальник контррозвідки', 'sbu', 'director'],
        // Прокуратура
        ['proc_admin', 'GoldScale2024', 'Віскар М.М.', 'Головний адміністратор Прокуратури', 'prosecutor', 'admin'],
        ['proc_general', 'JusticeLord777', 'Кулебяка А.А.', 'Генеральний прокурор', 'prosecutor', 'director'],
        // Администратор
        ['system_admin', 'MasterControl2024', 'Системний адміністратор', 'Головний адміністратор', 'admin', 'admin']
    ];
    
    users.forEach(user => {
        const [username, password, name, position, agency, role] = user;
        const passwordHash = bcrypt.hashSync(password, 10);
        
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (!row) {
                db.run(
                    'INSERT INTO users (username, password_hash, name, position, agency, role) VALUES (?, ?, ?, ?, ?, ?)',
                    [username, passwordHash, name, position, agency, role]
                );
            }
        });
    });
}

// API маршруты
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.json({ success: false, message: 'Користувача не знайдено' });
        }
        
        if (bcrypt.compareSync(password, user.password_hash)) {
            delete user.password_hash;
            
            // Логируем вход
            logAction('login', 'Успішний вхід в систему', {
                username,
                agency: user.agency
            }, user);
            
            res.json({ success: true, user });
        } else {
            logAction('login', 'Невдала спроба входу', { username, status: 'failed' });
            res.json({ success: false, message: 'Невірний пароль' });
        }
    });
});

app.get('/api/cases', (req, res) => {
    const { agency, status, search } = req.query;
    
    let query = 'SELECT c.*, u.name as created_by_name FROM cases c LEFT JOIN users u ON c.created_by = u.id WHERE c.is_deleted = 0';
    const params = [];
    
    if (agency) {
        query += ' AND c.agency = ?';
        params.push(agency);
    }
    
    if (status) {
        query += ' AND c.status = ?';
        params.push(status);
    }
    
    if (search) {
        query += ' AND (c.case_number LIKE ? OR c.title LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY c.created_date DESC';
    
    db.all(query, params, (err, cases) => {
        if (err) {
            return res.json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, cases, count: cases.length });
    });
});

app.post('/api/cases', (req, res) => {
    const { auth, case: caseData } = req.body;
    
    // Аутентификация
    authenticate(auth.username, auth.password, (user) => {
        if (!user) {
            return res.json({ success: false, message: 'Необхідна авторизація' });
        }
        
        db.run(
            `INSERT INTO cases (
                case_number, title, description, category, priority, status,
                agency, created_by, responsible, created_date, location, region
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                caseData.case_number,
                caseData.title,
                caseData.description || '',
                caseData.category || 'criminal',
                caseData.priority || 'medium',
                caseData.status || 'new',
                user.agency,
                user.id,
                user.name,
                caseData.created_date || new Date().toISOString().split('T')[0],
                caseData.location || '',
                caseData.region || ''
            ],
            function(err) {
                if (err) {
                    return res.json({ success: false, message: 'Помилка створення справи' });
                }
                
                logAction('create', 'Створення нової справи', {
                    case_number: caseData.case_number,
                    case_title: caseData.title,
                    case_id: this.lastID
                }, user);
                
                res.json({ success: true, message: 'Справу успішно створено', case_id: this.lastID });
            }
        );
    });
});

function authenticate(username, password, callback) {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password_hash)) {
            return callback(null);
        }
        delete user.password_hash;
        callback(user);
    });
}

function logAction(type, action, details = {}, user = null) {
    db.run(
        `INSERT INTO system_logs (log_type, action, details, user_id, username, agency, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            type,
            action,
            JSON.stringify(details),
            user?.id || null,
            user?.username || null,
            user?.agency || null,
            req?.ip || '127.0.0.1',
            req?.get('User-Agent') || ''
        ]
    );
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`ЄРДР сервер запущено на порту ${PORT}`);
    console.log(`Доступно за адресою: http://localhost:${PORT}`);
});
