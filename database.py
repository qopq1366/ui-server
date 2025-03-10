import sqlite3
import json
from datetime import datetime

class Database:
    def __init__(self, db_name='admin_panel.db'):
        self.db_name = db_name
        self.init_database()

    def init_database(self):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            
            # Создаем таблицу пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_username ON users(username)')
            
            # Создаем таблицу контента
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT,
                    date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Создаем таблицу истории изменений
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT,
                    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Добавляем админа, если его нет
            cursor.execute('SELECT * FROM users WHERE username = ?', ('admin',))
            if not cursor.fetchone():
                cursor.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    ('admin', 'admin')
                )
                print("Администратор успешно создан")
            
            conn.commit()

    def get_users(self):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT username, date_added FROM users')
            users = cursor.fetchall()
            return {'users': [{'username': u[0], 'dateAdded': u[1]} for u in users]}

    def add_user(self, username, password):
        try:
            with sqlite3.connect(self.db_name) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    (username, password)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            return False

    def delete_user(self, username):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM users WHERE username = ? AND username != "admin"', (username,))
            conn.commit()
            return cursor.rowcount > 0

    def verify_user(self, username, password):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?', 
                         (username, password))
            return cursor.fetchone() is not None

    def save_content(self, content):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            # Сохраняем новый контент
            cursor.execute('INSERT INTO content (content) VALUES (?)', (content,))
            # Добавляем в историю
            cursor.execute('INSERT INTO history (content) VALUES (?)', (content,))
            conn.commit()

    def get_content(self):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT content FROM content ORDER BY id DESC LIMIT 1')
            result = cursor.fetchone()
            return {'content': result[0] if result else ''}

    def get_history(self):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT content, date_added FROM history ORDER BY id DESC')
            history = cursor.fetchall()
            return {
                'history': [
                    {
                        'content': h[0],
                        'date': h[1]
                    } for h in history
                ]
            }

    def get_tables(self):
        """Получить список всех таблиц с их структурой"""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            # Получаем список таблиц
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            result = []
            for table in tables:
                table_name = table[0]
                # Получаем информацию о структуре таблицы
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                # Получаем количество записей
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                
                result.append({
                    'name': table_name,
                    'columns': [{'name': col[1], 'type': col[2]} for col in columns],
                    'records_count': count
                })
            
            return {'tables': result}

    def get_table_data(self, table_name, limit=100):
        """Получить данные таблицы"""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
                rows = cursor.fetchall()
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [col[1] for col in cursor.fetchall()]
                
                return {
                    'columns': columns,
                    'rows': rows
                }
            except sqlite3.Error as e:
                return {'error': str(e)}

    def execute_query(self, query):
        """Выполнить произвольный SQL-запрос"""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(query)
                conn.commit()
                if query.lower().startswith('select'):
                    return {'results': cursor.fetchall()}
                return {'message': 'Запрос выполнен успешно'}
            except sqlite3.Error as e:
                return {'error': str(e)}

    def create_table(self, table_name, columns):
        """Создать новую таблицу"""
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            try:
                columns_sql = ', '.join([f"{col['name']} {col['type']}" for col in columns])
                cursor.execute(f"CREATE TABLE {table_name} ({columns_sql})")
                conn.commit()
                return {'message': f'Таблица {table_name} успешно создана'}
            except sqlite3.Error as e:
                return {'error': str(e)}

