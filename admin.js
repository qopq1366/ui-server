let editor = null;

document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.querySelector('.theme-icon').textContent = savedTheme === 'light' ? '🌓' : '🌗';

    // При загрузке страницы сначала показываем форму входа
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('admin-content').style.display = 'none';

    // Привязываем обработчики
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }

    // Добавляем обработчики для полей ввода
    document.getElementById('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });

    checkAuth();
});

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('Пожалуйста, введите имя пользователя и пароль', 'error');
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
            
            if (!editor) {
                editor = new Quill('#editor', {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline'],
                            ['image', 'code-block']
                        ]
                    }
                });
                await loadContent();
            }
            showNotification('Успешный вход в систему');
        } else {
            showNotification(data.message || 'Ошибка авторизации', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при попытке входа', 'error');
    }
}

function initEditor() {
    editor = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['image', 'code-block']
            ]
        }
    });
    loadContent();
}

function switchTab(tabName) {
    // Скрываем все панели
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    const targetPanel = document.getElementById(`${tabName}-panel`);
    targetPanel.classList.remove('hidden');
    
    // Добавляем анимацию при переключении
    targetPanel.classList.add('animate__animated', 'animate__fadeIn');
    targetPanel.addEventListener('animationend', () => {
        targetPanel.classList.remove('animate__animated', 'animate__fadeIn');
    });

    // Обновляем активную кнопку
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    if (tabName === 'history') {
        loadHistory();
    }
    
    if (tabName === 'users') {
        loadUsers();
    }
}

async function saveContent() {
    const content = editor.root.innerHTML;
    
    try {
        const response = await fetch('/save-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ content: content })
        });

        const result = await response.json();
        if (response.ok) {
            showNotification('Контент успешно сохранен!');
        } else {
            alert('Ошибка при сохранении: ' + (result.message || response.statusText));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении контента');
    }
}

async function loadContent() {
    try {
        const response = await fetch('/get-content', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.content) {
                editor.root.innerHTML = data.content;
                // Обновляем предпросмотр если он открыт
                const preview = document.getElementById('preview');
                if (!preview.classList.contains('hidden')) {
                    preview.innerHTML = data.content;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки контента:', error);
        alert('Не удалось загрузить контент');
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/get-history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            const historyList = document.querySelector('.history-list');
            historyList.innerHTML = '';
            
            data.history.reverse().forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-date">${item.date}</div>
                    <button class="secondary-btn" onclick='restoreVersion(${JSON.stringify(item.content)})'>
                        Восстановить версию
                    </button>
                `;
                historyList.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

function restoreVersion(content) {
    if (confirm('Вы уверены, что хотите восстановить эту версию?')) {
        editor.root.innerHTML = content;
    }
}

function previewContent() {
    const preview = document.getElementById('preview');
    preview.classList.toggle('hidden');
    preview.innerHTML = editor.root.innerHTML;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminAuth');
    document.getElementById('admin-content').style.display = 'none';
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    if (editor) {
        editor = null;
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/get-users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            const usersList = document.querySelector('.users-list');
            usersList.innerHTML = `
                <h3>Список пользователей (${data.users.length})</h3>
                <div class="users-grid">
                    ${data.users.map(user => `
                        <div class="user-item">
                            <div class="user-info">
                                <span class="username">${user.username}</span>
                                <span class="user-date">Добавлен: ${user.dateAdded}</span>
                            </div>
                            ${user.username !== 'admin' ? `
                                <button onclick="deleteUser('${user.username}')" class="delete-btn">
                                    Удалить
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

async function deleteUser(username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
        return;
    }

    try {
        const response = await fetch('/delete-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        alert(data.message);
        
        if (response.ok) {
            showNotification(`Пользователь ${username} успешно удален!`);
            loadUsers(); // Перезагружаем список пользователей
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении пользователя');
    }
}

function showAddUserForm() {
    const usersList = document.querySelector('.users-list');
    usersList.insertAdjacentHTML('afterbegin', `
        <div class="add-user-form">
            <input type="text" id="new-username" placeholder="Имя пользователя">
            <input type="password" id="new-password" placeholder="Пароль">
            <button onclick="addUser()" class="primary-btn">Добавить</button>
            <button onclick="cancelAddUser()" class="secondary-btn">Отмена</button>
        </div>
    `);
    document.querySelector('#add-user-btn').style.display = 'none';
}

function cancelAddUser() {
    document.querySelector('.add-user-form').remove();
    document.querySelector('#add-user-btn').style.display = 'block';
}

async function addUser() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;

    if (!username || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await fetch('/add-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        alert(data.message);
        
        if (response.ok) {
            showNotification('Пользователь успешно добавлен!');
            cancelAddUser();
            loadUsers();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении пользователя');
    }
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('admin-content').style.display = 'none';
        return false;
    }

    // Проверяем валидность токена
    fetch('/get-content', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(response => {
        if (!response.ok) {
            localStorage.removeItem('authToken');
            document.getElementById('login-form').style.display = 'flex';
            document.getElementById('admin-content').style.display = 'none';
            showNotification('Сессия истекла, пожалуйста, войдите снова', 'error');
        } else {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
            initEditor();
        }
    }).catch(error => {
        console.error('Ошибка проверки авторизации:', error);
        showNotification('Ошибка проверки авторизации', 'error');
    });

    return true;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Анимация иконки
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = newTheme === 'light' ? '🌓' : '🌗';
    themeIcon.classList.add('animate__animated', 'animate__rotateIn');
    themeIcon.addEventListener('animationend', () => {
        themeIcon.classList.remove('animate__animated', 'animate__rotateIn');
    });
}

async function refreshTables() {
    try {
        const response = await fetch('/get-tables', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tablesList = document.querySelector('.tables-list');
            tablesList.innerHTML = `
                <div class="tables-grid">
                    ${data.tables.map(table => `
                        <div class="table-item">
                            <h3>${table.name}</h3>
                            <p>Количество записей: ${table.records_count}</p>
                            <div class="table-columns">
                                ${table.columns.map(col => `
                                    <span class="column-info">${col.name} (${col.type})</span>
                                `).join('')}
                            </div>
                            <div class="table-actions">
                                <button onclick="viewTableData('${table.name}')" class="secondary-btn">
                                    Просмотр данных
                                </button>
                                <button onclick="showQueryForm('${table.name}')" class="primary-btn">
                                    Выполнить запрос
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки таблиц:', error);
        showNotification('Ошибка загрузки таблиц', 'error');
    }
}

async function viewTableData(tableName) {
    try {
        const response = await fetch(`/get-table-data/${tableName}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Данные таблицы ${tableName}</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    ${data.columns.map(col => `<th>${col}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${data.rows.map(row => `
                                    <tr>
                                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="secondary-btn">
                        Закрыть
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных таблицы:', error);
        showNotification('Ошибка загрузки данных таблицы', 'error');
    }
}

function showCreateTableForm() {
    const form = document.createElement('div');
    form.className = 'modal';
    form.innerHTML = `
        <div class="modal-content">
            <h3>Создание новой таблицы</h3>
            <div class="create-table-form">
                <input type="text" id="table-name" placeholder="Название таблицы">
                <div id="columns-list">
                    <div class="column-input">
                        <input type="text" placeholder="Имя столбца" class="column-name">
                        <select class="column-type">
                            <option value="TEXT">TEXT</option>
                            <option value="INTEGER">INTEGER</option>
                            <option value="REAL">REAL</option>
                            <option value="BLOB">BLOB</option>
                        </select>
                        <button onclick="this.parentElement.remove()" class="delete-btn">✕</button>
                    </div>
                </div>
                <button onclick="addColumnInput()" class="secondary-btn">Добавить столбец</button>
                <div class="form-actions">
                    <button onclick="createTable(this.parentElement.parentElement.parentElement.parentElement)" 
                            class="primary-btn">Создать</button>
                    <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                            class="secondary-btn">Отмена</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(form);
}

function addColumnInput() {
    const columnsList = document.getElementById('columns-list');
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column-input';
    columnDiv.innerHTML = `
        <input type="text" placeholder="Имя столбца" class="column-name">
        <select class="column-type">
            <option value="TEXT">TEXT</option>
            <option value="INTEGER">INTEGER</option>
            <option value="REAL">REAL</option>
            <option value="BLOB">BLOB</option>
        </select>
        <button onclick="this.parentElement.remove()" class="delete-btn">✕</button>
    `;
    columnsList.appendChild(columnDiv);
}

async function createTable(modalElement) {
    const tableName = document.getElementById('table-name').value;
    const columns = [];
    document.querySelectorAll('.column-input').forEach(input => {
        columns.push({
            name: input.querySelector('.column-name').value,
            type: input.querySelector('.column-type').value
        });
    });

    try {
        const response = await fetch('/create-table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                name: tableName,
                columns: columns
            })
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('Таблица успешно создана');
            modalElement.remove();
            refreshTables();
        } else {
            showNotification(data.error || 'Ошибка при создании таблицы', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при создании таблицы', 'error');
    }
}

function showQueryForm(tableName = '') {
    const form = document.createElement('div');
    form.className = 'modal';
    form.innerHTML = `
        <div class="modal-content">
            <h3>SQL Запрос${tableName ? ` для таблицы ${tableName}` : ''}</h3>
            <div class="query-form">
                <textarea id="sql-query" 
                    placeholder="Введите SQL запрос..."
                    rows="5"
                >${tableName ? `SELECT * FROM ${tableName}` : ''}</textarea>
                <div class="form-actions">
                    <button onclick="executeQuery(this.parentElement.parentElement.parentElement.parentElement)" 
                            class="primary-btn">Выполнить</button>
                    <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                            class="secondary-btn">Отмена</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(form);
}

async function executeQuery(modalElement) {
    const query = document.getElementById('sql-query').value;

    try {
        const response = await fetch('/execute-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('Запрос выполнен успешно');
            if (data.results) {
                // Показываем результаты в модальном окне
                const resultsDiv = document.createElement('div');
                resultsDiv.className = 'query-results';
                resultsDiv.innerHTML = `
                    <h4>Результаты запроса:</h4>
                    <pre>${JSON.stringify(data.results, null, 2)}</pre>
                `;
                modalElement.querySelector('.query-form').appendChild(resultsDiv);
            }
            refreshTables();
        } else {
            showNotification(data.error || 'Ошибка при выполнении запроса', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при выполнении запроса', 'error');
    }
}
