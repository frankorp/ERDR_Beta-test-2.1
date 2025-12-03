// 🔐 Аутентификация
const API_URL = 'server.php';

let currentUser = null;
let currentAgency = null;

// Функции для работы с API
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'API error');
        }
        
        return result;
    } catch (error) {
        console.error('API request failed:', error);
        showNotification(`Помилка: ${error.message}`, 'error');
        throw error;
    }
}

// 🔐 АВТОРИЗАЦИЯ
async function login(username, password) {
    try {
        const result = await apiRequest('/api/login', 'POST', { username, password });
        
        if (result.success) {
            currentUser = result.user;
            currentAgency = result.user.agency;
            
            showNotification(`Вітаємо, ${currentUser.name}!`, 'success');
            showAgencyPanel();
            loadCasesForAgency();
            
            return true;
        }
    } catch (error) {
        showNotification('Невірний логін або пароль', 'error');
        return false;
    }
}

// 📋 ЗАГРУЗКА ДЕЛ
async function loadCasesForAgency() {
    if (!currentAgency) return;
    
    try {
        const result = await apiRequest(`/api/cases?agency=${currentAgency}`);
        
        const tableBody = document.getElementById(`${currentAgency}-cases-table`);
        if (!tableBody) return;
        
        tableBody.innerHTML = result.cases.map(caseItem => `
            <tr>
                <td>${caseItem.case_number}</td>
                <td>${caseItem.title}</td>
                <td><span class="badge case-status-${caseItem.status}">${getStatusText(caseItem.status)}</span></td>
                <td>${caseItem.created_date}</td>
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
    } catch (error) {
        console.error('Failed to load cases:', error);
    }
}

// 📊 ОБНОВЛЕНИЕ СТАТИСТИКИ
async function updateStatistics() {
    if (!currentAgency) return;
    
    try {
        const result = await apiRequest(`/api/stats?agency=${currentAgency}`);
        
        const stats = result.stats;
        document.getElementById(`${currentAgency}-total-cases`).textContent = stats.total_cases || 0;
        document.getElementById(`${currentAgency}-active-cases`).textContent = stats.active_cases || 0;
        document.getElementById(`${currentAgency}-critical-cases`).textContent = stats.critical_cases || 0;
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// ➕ СОЗДАНИЕ НОВОГО ДЕЛА
async function addNewCase() {
    const caseData = {
        case_number: document.getElementById('caseNumber').value,
        title: document.getElementById('caseTitle').value,
        description: document.getElementById('caseDescription').value,
        category: document.getElementById('caseCategory').value,
        priority: document.getElementById('casePriority').value,
        location: document.getElementById('caseLocation')?.value || '',
        region: document.getElementById('caseRegion')?.value || ''
    };
    
    if (!caseData.case_number || !caseData.title) {
        showNotification('Заповніть обов\'язкові поля: Назва та Номер справи!', 'error');
        return;
    }
    
    try {
        const result = await apiRequest('/api/cases', 'POST', {
            auth: {
                username: currentUser.username,
                password: getCurrentUserPassword() // Нужно хранить пароль в сессии
            },
            case: caseData
        });
        
        if (result.success) {
            showNotification(`Справа "${caseData.title}" успішно створена!`, 'success');
            closeAddCaseModal();
            loadCasesForAgency();
        }
    } catch (error) {
        console.error('Failed to create case:', error);
    }
}

// 🗑️ УДАЛЕНИЕ ДЕЛА
async function confirmCaseDeletion() {
    const username = document.getElementById('prosecutorUsername').value;
    const password = document.getElementById('prosecutorPassword').value;
    const caseId = window.caseToDelete;
    
    if (!username || !password || !caseId) {
        showNotification('Заповніть всі поля для підтвердження', 'error');
        return;
    }
    
    try {
        const result = await apiRequest('/api/cases/delete', 'POST', {
            auth: { username, password },
            case_id: caseId
        });
        
        if (result.success) {
            showNotification('Справу успішно видалено!', 'success');
            closeProsecutorConfirmModal();
            loadCasesForAgency();
        }
    } catch (error) {
        showNotification('Помилка видалення: ' + error.message, 'error');
    }
}

// 📋 ЗАГРУЗКА ЛОГОВ
async function loadLogs(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const result = await apiRequest(`/api/logs?${queryParams}`);
        
        const container = document.getElementById('logs-container');
        if (!container) return;
        
        container.innerHTML = result.logs.map(log => `
            <div class="log-item log-type-${log.log_type}">
                <div class="log-info">
                    <div class="log-action">${getLogActionText(log)}</div>
                    <div class="log-details">${getLogDetailsText(log)}</div>
                    <div class="log-meta">
                        <span>👤 ${log.username || 'Система'}</span>
                        <span>🏢 ${getAgencyName(log.agency)}</span>
                        <span>🌐 ${log.ip_address}</span>
                        <span>🕒 ${new Date(log.created_at).toLocaleString('uk-UA')}</span>
                    </div>
                </div>
                <div class="badge badge-${getLogStatusColor(log)}">${getLogTypeText(log.log_type)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

// 📥 ЭКСПОРТ ДАННЫХ
async function exportData(format = 'csv') {
    try {
        if (format === 'csv') {
            window.open(`${API_URL}/api/export?agency=${currentAgency}&format=csv`, '_blank');
        } else {
            const result = await apiRequest(`/api/export?agency=${currentAgency}`);
            // Обработка JSON экспорта
            downloadJSON(result.cases, `erdr_cases_${currentAgency}_${new Date().toISOString().split('T')[0]}.json`);
        }
        showNotification('Дані експортовано успішно', 'success');
    } catch (error) {
        console.error('Export failed:', error);
    }
}

// Вспомогательные функции
function getCurrentUserPassword() {
    // В реальной системе пароль должен приходить при логине и храниться в безопасном месте
    // Это упрощенный пример
    const passwordMap = {
        'gunp_admin': 'BlueDragon2024',
        'proc_general': 'JusticeLord777',
        // ... другие пользователи
    };
    return passwordMap[currentUser?.username] || '';
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    // Проверяем, есть ли активная сессия
    const savedUser = localStorage.getItem('erdr_current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            currentAgency = currentUser.agency;
            showAgencyPanel();
            loadCasesForAgency();
        } catch (e) {
            localStorage.removeItem('erdr_current_user');
        }
    }
    
    // Сохраняем пользователя при логине
    window.login = async function() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        const success = await login(username, password);
        if (success) {
            localStorage.setItem('erdr_current_user', JSON.stringify(currentUser));
            closeLoginModal();
        }
    };
    
    // Выход из системы
    window.logout = function() {
        currentUser = null;
        currentAgency = null;
        localStorage.removeItem('erdr_current_user');
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        showNotification('До побачення!');
    };
});
