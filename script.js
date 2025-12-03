// 🔐 24 АБСОЛЮТНО РІЗНИХ ПАРОЛЯ
const USERS = {
    gunp: [
        { username: "gunp_admin", password: "BlueDragon2024", name: "Коваленко І.П.", position: "Головний адміністратор ГУНП" },
        { username: "gunp_director", password: "PoliceGuard987", name: "Петренко О.В.", position: "Начальник управління" },
        { username: "gunp_deputy", password: "SecureBase555", name: "Шевченко М.І.", position: "Заступник начальника" },
        { username: "gunp_senior", password: "Investigator777", name: "Бондаренко С.П.", position: "Старший слідчий" },
        { username: "gunp_invest", password: "CrimeHunter333", name: "Сидоренко В.П.", position: "Слідчий" },
        { username: "gunp_oper", password: "PatrolAgent111", name: "Кравченко А.М.", position: "Оперативник" },
        { username: "gunp_analyst", password: "DataAnalyzer999", name: "Павленко І.В.", position: "Аналітик" },
        { username: "gunp_tech", password: "TechSupport444", name: "Ткачук Р.О.", position: "Технічний спеціаліст" }
    ],
    sbu: [
        { username: "sbu_admin", password: "RedShadow2024", name: "Мельник А.В.", position: "Головний адміністратор СБУ" },
        { username: "sbu_counter", password: "CounterSpy789", name: "Ковальчук С.М.", position: "Начальник контррозвідки" },
        { username: "sbu_senior", password: "SecretAgent456", name: "Ткаченко І.П.", position: "Старший оперуповноважений" },
        { username: "sbu_oper", password: "UnderCover123", name: "Лисенко О.Р.", position: "Оперуповноважений" },
        { username: "sbu_cyber", password: "CyberShield321", name: "Шевчук М.С.", position: "Кіберспеціаліст" },
        { username: "sbu_analyst", password: "IntelMaster654", name: "Білий В.П.", position: "Аналітик розвідки" },
        { username: "sbu_security", password: "SafeGuard987", name: "Чорний О.І.", position: "Спеціаліст безпеки" },
        { username: "sbu_tech", password: "TechWizard555", name: "Зеленський П.М.", position: "Технічний експерт" }
    ],
    prosecutor: [
        { username: "proc_admin", password: "GoldScale2024", name: "Віскар М.М.", position: "Головний адміністратор Прокуратури" },
        { username: "proc_general", password: "JusticeLord777", name: "Кулебяка А.А.", position: "Генеральний прокурор" },
        { username: "proc_deputy", password: "LawMaster888", name: "Маркієнко М.С.", position: "Заступник прокурора" },
        { username: "proc_senior", password: "SeniorLaw555", name: "Шмелев А.Є.", position: "Старший прокурор" },
        { username: "proc_dept", password: "DeptChief333", name: "Петров К.О.", position: "Прокурор відділу" },
        { username: "proc_assist", password: "LegalAid111", name: "Іванова Л.М.", position: "Помічник прокурора" },
        { username: "proc_criminal", password: "CrimeLaw222", name: "Семенюк В.І.", position: "Прокурор-криміналіст" },
        { username: "proc_super", password: "Supervisor999", name: "Козак Р.С.", position: "Спеціаліст з нагляду" }
    ],
    admin: [
        { username: "system_admin", password: "MasterControl2024", name: "Системний адміністратор", position: "Головний адміністратор" }
    ]
};

// База даних справ
let CASES_DATABASE = {
    gunp: [],
    sbu: [],
    prosecutor: []
};

// 🔥 СИСТЕМА ЛОГИРОВАНИЯ
const SYSTEM_LOGS = {
    logs: [],
    securityAlerts: []
};

// Типы логов
const LOG_TYPES = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    CREATE_CASE: 'create',
    DELETE_CASE: 'delete',
    VIEW_CASE: 'view',
    EXPORT_DATA: 'export',
    SYSTEM: 'system'
};

// Глобальные переменные
let currentAgency = null;
let currentUser = null;
let caseToDelete = null;

// Генерация случайного IP
function generateRandomIP() {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Функция логирования
function logAction(type, action, details = {}, user = null, agency = null) {
    const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type: type,
        action: action,
        details: details,
        user: user || (currentUser ? currentUser.name : 'Система'),
        username: user ? user.username : (currentUser ? currentUser.username : 'system'),
        agency: agency || currentAgency || 'system',
        ip: generateRandomIP(),
        userAgent: navigator.userAgent
    };

    SYSTEM_LOGS.logs.unshift(logEntry);
    saveLogsToStorage();

    // Обновляем UI если открыта панель логов
    if (document.getElementById('admin-logs') && document.getElementById('admin-logs').style.display !== 'none') {
        renderLogs();
    }

    console.log(`📝 LOG [${type}]: ${action}`, logEntry);
}

// Сохранение логов
function saveLogsToStorage() {
    try {
        localStorage.setItem('erdr_system_logs', JSON.stringify(SYSTEM_LOGS.logs.slice(0, 1000)));
    } catch (e) {
        console.error('Помилка збереження логів:', e);
    }
}

// Загрузка логов
function loadLogsFromStorage() {
    try {
        const savedLogs = localStorage.getItem('erdr_system_logs');
        if (savedLogs) {
            SYSTEM_LOGS.logs = JSON.parse(savedLogs);
        }
    } catch (e) {
        console.error('Помилка завантаження логів:', e);
    }
}

// Рендеринг логов
function renderLogs(filteredLogs = null) {
    const logsToRender = filteredLogs || SYSTEM_LOGS.logs;
    const container = document.getElementById('logs-container');
    
    if (!container) return;
    
    container.innerHTML = logsToRender.map(log => `
        <div class="log-item log-type-${log.type}">
            <div class="log-info">
                <div class="log-action">${getLogActionText(log)}</div>
                <div class="log-details">${getLogDetailsText(log)}</div>
                <div class="log-meta">
                    <span>👤 ${log.user}</span>
                    <span>🏢 ${getAgencyName(log.agency)}</span>
                    <span>🌐 <span class="log-ip">${log.ip}</span></span>
                    <span>🕒 ${new Date(log.timestamp).toLocaleString('uk-UA')}</span>
                </div>
            </div>
            <div class="badge badge-${getLogStatusColor(log)}">${getLogTypeText(log.type)}</div>
        </div>
    `).join('');

    updateSecurityStats();
    populateUserFilter();
}

// Вспомогательные функции для логов
function getLogActionText(log) {
    const actions = {
        [LOG_TYPES.LOGIN]: `Вхід в систему`,
        [LOG_TYPES.LOGOUT]: `Вихід з системи`,
        [LOG_TYPES.CREATE_CASE]: `Створення справи`,
        [LOG_TYPES.DELETE_CASE]: `Видалення справи`,
        [LOG_TYPES.VIEW_CASE]: `Перегляд справи`,
        [LOG_TYPES.EXPORT_DATA]: `Експорт даних`,
        [LOG_TYPES.SYSTEM]: `Системна подія`
    };
    return actions[log.type] || log.action;
}

function getLogDetailsText(log) {
    switch (log.type) {
        case LOG_TYPES.LOGIN:
            return `Користувач: ${log.details.username} • Статус: ${log.details.status === 'success' ? 'Успішно' : 'Невдало'}`;
        case LOG_TYPES.CREATE_CASE:
            return `Справа: ${log.details.caseNumber} • ${log.details.caseTitle}`;
        case LOG_TYPES.DELETE_CASE:
            return `Справа: ${log.details.caseNumber} • Підтверджено: ${log.details.confirmedBy}`;
        case LOG_TYPES.VIEW_CASE:
            return `Справа: ${log.details.caseNumber}`;
        case LOG_TYPES.EXPORT_DATA:
            return `Експортовано: ${log.details.recordCount} записів`;
        default:
            return log.details.message || '';
    }
}

function getLogTypeText(type) {
    const types = {
        [LOG_TYPES.LOGIN]: 'ВХІД',
        [LOG_TYPES.LOGOUT]: 'ВИХІД',
        [LOG_TYPES.CREATE_CASE]: 'СТВОРЕННЯ',
        [LOG_TYPES.DELETE_CASE]: 'ВИДАЛЕННЯ',
        [LOG_TYPES.VIEW_CASE]: 'ПЕРЕГЛЯД',
        [LOG_TYPES.EXPORT_DATA]: 'ЕКСПОРТ',
        [LOG_TYPES.SYSTEM]: 'СИСТЕМА'
    };
    return types[type] || type;
}

function getLogStatusColor(log) {
    if (log.type === LOG_TYPES.DELETE_CASE) return 'danger';
    if (log.type === LOG_TYPES.LOGIN && log.details.status === 'failed') return 'warning';
    if (log.type === LOG_TYPES.CREATE_CASE) return 'success';
    return 'primary';
}

function getAgencyName(agency) {
    const agencies = {
        'gunp': 'ГУНП',
        'sbu': 'СБУ',
        'prosecutor': 'Прокуратура',
        'system': 'Система'
    };
    return agencies[agency] || agency;
}

// Фильтрация логов
function filterLogs(filterType, value) {
    let filteredLogs = SYSTEM_LOGS.logs;

    if (filterType === 'type' && value) {
        filteredLogs = filteredLogs.filter(log => log.type === value);
    } else if (filterType === 'user' && value) {
        filteredLogs = filteredLogs.filter(log => log.username === value);
    } else if (filterType === 'agency' && value) {
        filteredLogs = filteredLogs.filter(log => log.agency === value);
    }

    renderLogs(filteredLogs);
}

// Заполнение фильтра пользователей
function populateUserFilter() {
    const userFilter = document.getElementById('log-user-filter');
    if (!userFilter) return;
    
    const uniqueUsers = [...new Set(SYSTEM_LOGS.logs.map(log => log.username))];
    
    userFilter.innerHTML = '<option value="">Всі користувачі</option>' +
        uniqueUsers.map(user => `<option value="${user}">${user}</option>`).join('');
}

// Обновление статистики безопасности
function updateSecurityStats() {
    const totalLogs = SYSTEM_LOGS.logs.length;
    const failedLogins = SYSTEM_LOGS.logs.filter(log => 
        log.type === LOG_TYPES.LOGIN && log.details.status === 'failed'
    ).length;
    const deleteActions = SYSTEM_LOGS.logs.filter(log => 
        log.type === LOG_TYPES.DELETE_CASE
    ).length;

    const totalEl = document.getElementById('security-total-logs');
    const failedEl = document.getElementById('security-failed-logins');
    const deleteEl = document.getElementById('security-delete-actions');

    if (totalEl) totalEl.textContent = totalLogs;
    if (failedEl) failedEl.textContent = failedLogins;
    if (deleteEl) deleteEl.textContent = deleteActions;
}

// Экспорт логов
function exportAllLogs() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Дата,Тип,Користувач,Відомство,Дія,Деталі,IP\n"
        + SYSTEM_LOGS.logs.map(log => 
            `"${new Date(log.timestamp).toLocaleString('uk-UA')}","${getLogTypeText(log.type)}","${log.user}","${getAgencyName(log.agency)}","${log.action}","${getLogDetailsText(log)}","${log.ip}"`
          ).join("\n");
    
    downloadCSV(csvContent, `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Експортовано всі логи системи');
}

function exportData(agency) {
    const cases = CASES_DATABASE[agency];
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Номер,Назва,Категорія,Статус,Дата,Відповідальний\n"
        + cases.map(c => 
            `"${c.number}","${c.title}","${c.category}","${getStatusText(c.status)}","${c.createdDate}","${c.responsible}"`
          ).join("\n");
    
    downloadCSV(csvContent, `${agency}_cases_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification(`Експортовано справи ${getAgencyName(agency)}`);
}

function exportAllData() {
    let allCases = [];
    Object.keys(CASES_DATABASE).forEach(agency => {
        CASES_DATABASE[agency].forEach(c => {
            allCases.push({
                agency: getAgencyName(agency),
                ...c
            });
        });
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + "Відомство,Номер,Назва,Категорія,Статус,Дата,Відповідальний\n"
        + allCases.map(c => 
            `"${c.agency}","${c.number}","${c.title}","${c.category}","${getStatusText(c.status)}","${c.createdDate}","${c.responsible}"`
          ).join("\n");
    
    downloadCSV(csvContent, `all_cases_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Експортовано всі справи з системи');
}

function downloadCSV(content, filename) {
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Уведомления
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.style.background = type === 'success' ? '#10b981' : '#ef4444';
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 🔄 ОСНОВНЫЕ ФУНКЦИИ СИСТЕМЫ
function selectAgency(agency) {
    currentAgency = agency;
    const agencyData = getAgencyData(agency);
    
    document.getElementById('modal-agency-name').textContent = agencyData.fullName;
    document.getElementById('modal-agency-desc').textContent = `Вхід до системи ${agencyData.name}`;
    document.getElementById('modal-avatar').textContent = agencyData.icon;
    document.getElementById('modal-avatar').style.background = agencyData.color;
    
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    showPasswordsForAgency(agency);
    document.getElementById('loginModal').style.display = 'flex';
}

function showPasswordsForAgency(agency) {
    const passwordList = document.getElementById('passwordList');
    const users = USERS[agency];
    
    if (!passwordList) return;
    
    passwordList.innerHTML = users.map(user => `
        <div class="password-item">
            <span>${user.username}</span>
            <span>${user.password}</span>
        </div>
    `).join('');
}

function getAgencyData(agency) {
    const agencies = {
        gunp: { name: "ГУНП", fullName: "Головне управління Національної поліції", color: "#1e40af", icon: "👮‍♂️" },
        sbu: { name: "СБУ", fullName: "Служба Безпеки України", color: "#dc2626", icon: "🕵️‍♂️" },
        prosecutor: { name: "Прокуратура", fullName: "Генеральна прокуратура України", color: "#7c2d12", icon: "⚖️" },
        admin: { name: "Адмін-панель", fullName: "Панель адміністратора системи", color: "#7e22ce", icon: "👨‍💼" }
    };
    return agencies[agency];
}

function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('Будь ласка, заповніть всі поля!');
        return;
    }
    
    const user = USERS[currentAgency].find(u => 
        u.username === username && u.password === password
    );
    
    if (user) {
        currentUser = user;
        
        logAction(LOG_TYPES.LOGIN, 'Успішний вхід в систему', {
            username: username,
            status: 'success',
            agency: currentAgency
        }, user);
        
        closeLoginModal();
        showAgencyPanel();
        loadCasesForAgency();
        showNotification(`Вітаємо, ${user.name}!`, 'success');
    } else {
        logAction(LOG_TYPES.LOGIN, 'Невдала спроба входу', {
            username: username,
            status: 'failed',
            agency: currentAgency
        });
        
        alert('Невірний логін або пароль! Використовуйте паролі зі списку нижче.');
    }
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function togglePassword() {
    const passwordInput = document.getElementById('loginPassword');
    if (!passwordInput) return;
    
    const toggleButton = document.querySelector('.input-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = '🔒';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = '👁️';
    }
}

function toggleProsecutorPassword() {
    const passwordInput = document.getElementById('prosecutorPassword');
    if (!passwordInput) return;
    
    const toggleButtons = document.querySelectorAll('.input-icon');
    const toggleButton = toggleButtons[toggleButtons.length - 1];
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = '🔒';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = '👁️';
    }
}

function showAgencyPanel() {
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    if (currentAgency === 'admin') {
        document.getElementById('admin-panel').style.display = 'block';
        showAdminTab('logs');
    } else {
        const panel = document.getElementById(`${currentAgency}-panel`);
        if (panel) {
            panel.style.display = 'block';
            document.getElementById(`${currentAgency}-user-name`).textContent = currentUser.name;
            document.getElementById(`${currentAgency}-user-position`).textContent = currentUser.position;
        }
    }
}

function showAdminTab(tabName, event = null) {
    // Приховуємо всі вкладки
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Видаляємо активний клас з усіх кнопок
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Показуємо обрану вкладку
    const tabElement = document.getElementById(`admin-${tabName}`);
    if (tabElement) {
        tabElement.style.display = 'block';
    }
    
    // Додаємо активний клас до поточної кнопки
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Если event не передан, находим кнопку по имени вкладки
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            if (tab.textContent.includes(tabName.toUpperCase()) || 
                tab.textContent.includes(getTabName(tabName))) {
                tab.classList.add('active');
            }
        });
    }

    // Якщо це вкладка логів - оновлюємо логи
    if (tabName === 'logs') {
        renderLogs();
    }
}

function getTabName(tab) {
    const names = {
        'logs': 'Системні логи',
        'security': 'Безпека',
        'export': 'Експорт даних'
    };
    return names[tab] || tab;
}

function logout() {
    if (currentUser) {
        logAction(LOG_TYPES.LOGOUT, 'Вихід з системи', {}, currentUser);
    }
    currentAgency = null;
    currentUser = null;
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    showNotification('До побачення!');
}

function showAddCaseModal() {
    document.getElementById('addCaseModal').style.display = 'flex';
    
    // Очищаем поля формы
    document.getElementById('caseTitle').value = '';
    document.getElementById('caseDescription').value = '';
    document.getElementById('caseNumber').value = '';
    document.getElementById('caseCategory').value = 'criminal';
    document.getElementById('casePriority').value = 'medium';
}

function closeAddCaseModal() {
    document.getElementById('addCaseModal').style.display = 'none';
}

function addNewCase() {
    const title = document.getElementById('caseTitle').value;
    const description = document.getElementById('caseDescription').value;
    const number = document.getElementById('caseNumber').value;
    const category = document.getElementById('caseCategory').value;
    const priority = document.getElementById('casePriority').value;
    
    if (!title || !number) {
        alert('Будь ласка, заповніть обов\'язкові поля: Назва та Номер справи!');
        return;
    }
    
    const newCase = {
        id: Date.now(),
        number: number,
        title: title,
        description: description,
        category: category,
        priority: priority,
        status: 'new',
        createdDate: new Date().toLocaleDateString('uk-UA'),
        createdBy: currentUser.name,
        responsible: currentUser.name,
        agency: currentAgency
    };
    
    CASES_DATABASE[currentAgency].push(newCase);
    updateStatistics();
    loadCasesForAgency();
    closeAddCaseModal();
    
    logAction(LOG_TYPES.CREATE_CASE, 'Створення нової справи', {
        caseNumber: number,
        caseTitle: title,
        category: category,
        priority: priority
    }, currentUser);
    
    showNotification(`Справа "${title}" успішно створена!`, 'success');
}

function loadCasesForAgency() {
    if (!currentAgency || currentAgency === 'admin') return;
    
    const cases = CASES_DATABASE[currentAgency];
    const tableBody = document.getElementById(`${currentAgency}-cases-table`);
    
    if (!tableBody) return;
    
    tableBody.innerHTML = cases.map(caseItem => `
        <tr>
            <td>${caseItem.number}</td>
            <td>${caseItem.title}</td>
            <td><span class="badge case-status-${caseItem.status}">${getStatusText(caseItem.status)}</span></td>
            <td>${caseItem.createdDate}</td>
            <td>${caseItem.responsible}</td>
            <td class="case-actions">
                <button class="btn btn-primary" onclick="viewCase(${caseItem.id})">👁️ Перегляд</button>
                ${currentAgency === 'prosecutor' ? 
                  `<button class="btn btn-danger" onclick="requestCaseDeletion(${caseItem.id})">🗑️ Видалити</button>` : 
                  `<button class="btn" disabled title="Тільки прокуратура може видаляти справи">🗑️ Видалити</button>`
                }
            </td>
        </tr>
    `).join('');
    
    updateStatistics();
}

function getStatusText(status) {
    const statuses = {
        'new': 'Нова',
        'in-progress': 'В роботі',
        'completed': 'Завершена',
        'closed': 'Закрита'
    };
    return statuses[status] || status;
}

function updateStatistics() {
    if (!currentAgency) return;
    
    const cases = CASES_DATABASE[currentAgency];
    const totalCases = cases.length;
    const activeCases = cases.filter(c => c.status === 'new' || c.status === 'in-progress').length;
    const criticalCases = cases.filter(c => c.priority === 'critical').length;
    
    const totalEl = document.getElementById(`${currentAgency}-total-cases`);
    const activeEl = document.getElementById(`${currentAgency}-active-cases`);
    const criticalEl = document.getElementById(`${currentAgency}-critical-cases`);
    
    if (totalEl) totalEl.textContent = totalCases;
    if (activeEl) activeEl.textContent = activeCases;
    if (criticalEl) criticalEl.textContent = criticalCases;
}

function viewCase(caseId) {
    const caseItem = CASES_DATABASE[currentAgency].find(c => c.id === caseId);
    if (caseItem) {
        logAction(LOG_TYPES.VIEW_CASE, 'Перегляд справи', {
            caseNumber: caseItem.number,
            caseTitle: caseItem.title
        }, currentUser);
        
        alert(`Перегляд справи:\n\nНомер: ${caseItem.number}\nНазва: ${caseItem.title}\nОпис: ${caseItem.description}\nСтатус: ${getStatusText(caseItem.status)}\nПріоритет: ${caseItem.priority}\nВідповідальний: ${caseItem.responsible}`);
    }
}

function requestCaseDeletion(caseId) {
    if (currentAgency !== 'prosecutor') {
        alert('Помилка доступу! Тільки прокуратура може видаляти справи.');
        return;
    }
    
    const caseItem = CASES_DATABASE[currentAgency].find(c => c.id === caseId);
    if (!caseItem) return;
    
    caseToDelete = caseId;
    
    const caseInfo = document.getElementById('caseToDeleteInfo');
    if (caseInfo) {
        caseInfo.innerHTML = `
            <h4>📋 Інформація про справу:</h4>
            <p><strong>Номер:</strong> ${caseItem.number}</p>
            <p><strong>Назва:</strong> ${caseItem.title}</p>
            <p><strong>Створена:</strong> ${caseItem.createdDate}</p>
            <p><strong>Відповідальний:</strong> ${caseItem.responsible}</p>
        `;
    }
    
    document.getElementById('prosecutorUsername').value = '';
    document.getElementById('prosecutorPassword').value = '';
    
    document.getElementById('prosecutorConfirmModal').style.display = 'flex';
}

function closeProsecutorConfirmModal() {
    document.getElementById('prosecutorConfirmModal').style.display = 'none';
    caseToDelete = null;
}

function confirmCaseDeletion() {
    const username = document.getElementById('prosecutorUsername').value;
    const password = document.getElementById('prosecutorPassword').value;
    
    if (!username || !password) {
        alert('Будь ласка, введіть логін та пароль прокурора для підтвердження!');
        return;
    }
    
    const prosecutor = USERS.prosecutor.find(u => 
        u.username === username && u.password === password
    );
    
    if (!prosecutor) {
        alert('Невірний логін або пароль прокурора! Видалення скасовано.');
        return;
    }
    
    const caseItem = CASES_DATABASE[currentAgency].find(c => c.id === caseToDelete);
    CASES_DATABASE[currentAgency] = CASES_DATABASE[currentAgency].filter(c => c.id !== caseToDelete);
    loadCasesForAgency();
    closeProsecutorConfirmModal();
    
    logAction(LOG_TYPES.DELETE_CASE, 'Видалення справи', {
        caseNumber: caseItem.number,
        caseTitle: caseItem.title,
        confirmedBy: prosecutor.name
    }, currentUser);
    
    showNotification(`Справу успішно видалено!\nПідтверджено прокурором: ${prosecutor.name}`);
}

// Ініціалізація тестових даних
function initializeTestData() {
    CASES_DATABASE.gunp.push({
        id: 1,
        number: "210/2024",
        title: "Розкрадання коштів бюджету",
        description: "Справа про розкрадання коштів місцевого бюджету",
        category: "criminal",
        priority: "high",
        status: "in-progress",
        createdDate: "15.01.2024",
        createdBy: "Коваленко І.П.",
        responsible: "Петренко О.В.",
        agency: "gunp"
    });

    CASES_DATABASE.sbu.push({
        id: 2,
        number: "СБУ-45/2024",
        title: "Контррозвідувальна операція",
        description: "Операція з виявлення іноземних агентів",
        category: "operational",
        priority: "critical",
        status: "in-progress",
        createdDate: "14.01.2024",
        createdBy: "Мельник А.В.",
        responsible: "Ковальчук С.М.",
        agency: "sbu"
    });

    CASES_DATABASE.prosecutor.push({
        id: 3,
        number: "П-789/2024",
        title: "Нагляд за розслідуванням",
        description: "Нагляд за дотриманням закону при розслідуванні",
        category: "supervision",
        priority: "medium",
        status: "new",
        createdDate: "16.01.2024",
        createdBy: "Віскар М.М.",
        responsible: "Кулебяка А.А.",
        agency: "prosecutor"
    });

    updateStatistics();
}

function initializeLoggingSystem() {
    loadLogsFromStorage();
    logAction(LOG_TYPES.SYSTEM, 'Система запущена', {
        version: '2.4.1',
        userAgent: navigator.userAgent
    });
}

// Запуск при завантаженні
window.onload = function() {
    initializeTestData();
    initializeLoggingSystem();
    console.log('🛡️ ЄРДР PRO System Initialized');
    console.log('24 unique passwords + logging system loaded');
    
    // Добавляем обработчики для клавиши Enter
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            // Enter в модальном окне логина
            if (document.getElementById('loginModal').style.display === 'flex') {
                login();
            }
            
            // Enter в модальном окне добавления дела
            if (document.getElementById('addCaseModal').style.display === 'flex') {
                addNewCase();
            }
            
            // Enter в модальном окне подтверждения удаления
            if (document.getElementById('prosecutorConfirmModal').style.display === 'flex') {
                confirmCaseDeletion();
            }
        }
    });
};
