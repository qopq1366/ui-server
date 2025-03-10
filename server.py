from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import time
from database import Database

class CustomHandler(BaseHTTPRequestHandler):
    db = Database()
    active_sessions = {}

    def _set_headers(self, content_type='text/html'):
        self.send_response(200)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        # Список путей, которые не требуют авторизации
        public_paths = ['/', '/index.html', '/styles.css', '/script.js', '/admin.html']
        
        # Проверяем является ли путь публичным
        if self.path in public_paths or self.path.endswith(('.css', '.js')):
            try:
                path = self.path[1:] if self.path != '/' else 'index.html'
                with open(path, 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-type', self._get_content_type(path))
                    self.end_headers()
                    self.wfile.write(f.read())
                return
            except FileNotFoundError:
                self.send_error(404)
                return

        # Проверяем авторизацию для остальных путей
        if not self._check_auth():
            self.send_response(401)
            self._set_headers('application/json')
            response = {"status": "error", "message": "Требуется авторизация"}
            self.wfile.write(json.dumps(response).encode())
            return

        # Обработка остальных запросов
        if self.path == '/get-content':
            self._set_headers('application/json')
            content = self.db.get_content()
            self.wfile.write(json.dumps(content).encode())

        elif self.path == '/get-history':
            self._set_headers('application/json')
            history = self.db.get_history()
            self.wfile.write(json.dumps(history).encode())

        elif self.path == '/get-users':
            self._set_headers('application/json')
            users = self.db.get_users()
            self.wfile.write(json.dumps(users).encode())

        elif self.path == '/get-tables':
            self._set_headers('application/json')
            tables = self.db.get_tables()
            self.wfile.write(json.dumps(tables).encode())

        elif self.path.startswith('/get-table-data/'):
            table_name = self.path.split('/')[-1]
            self._set_headers('application/json')
            data = self.db.get_table_data(table_name)
            self.wfile.write(json.dumps(data).encode())

        elif self.path == '/get-chat-history':
            self._set_headers('application/json')
            chat_history = self.db.get_chat_messages()
            self.wfile.write(json.dumps(chat_history).encode())

        else:
            try:
                path = self.path[1:] if self.path != '/' else 'index.html'
                with open(path, 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-type', self._get_content_type(path))
                    self.end_headers()
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404)

    def do_POST(self):
        if not self._check_auth() and self.path != '/login':
            self.send_response(401)
            self._set_headers('application/json')
            response = {"status": "error", "message": "Требуется авторизация"}
            self.wfile.write(json.dumps(response).encode())
            return

        if self.path == '/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"Попытка входа: {data['username']}")  # Добавляем логирование
            
            if self.db.verify_user(data['username'], data['password']):
                token = f"{data['username']}:{int(time.time())}"
                self.active_sessions[data['username']] = token
                
                self._set_headers('application/json')
                response = {
                    "status": "success",
                    "message": "Авторизация успешна",
                    "token": token
                }
                print("Успешный вход")
            else:
                self.send_response(401)
                self._set_headers('application/json')
                response = {
                    "status": "error",
                    "message": "Неверное имя пользователя или пароль"
                }
                print("Неверные учетные данные")
            
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/add-user':
            if not self._check_auth():
                return
                
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            new_user = json.loads(post_data.decode('utf-8'))
            
            if self.db.add_user(new_user['username'], new_user['password']):
                self._set_headers('application/json')
                response = {
                    "status": "success",
                    "message": "Пользователь успешно добавлен"
                }
            else:
                self.send_response(400)
                self._set_headers('application/json')
                response = {
                    "status": "error",
                    "message": "Пользователь с таким именем уже существует"
                }
            
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/delete-user':
            if not self._check_auth():
                return
                
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            if self.db.delete_user(data['username']):
                self._set_headers('application/json')
                response = {
                    "status": "success",
                    "message": f"Пользователь {data['username']} успешно удален"
                }
            else:
                self.send_response(400)
                self._set_headers('application/json')
                response = {
                    "status": "error",
                    "message": "Не удалось удалить пользователя"
                }
            
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/save-content':
            if not self._check_auth():
                return
                
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            self.db.save_content(data['content'])
            
            self._set_headers('application/json')
            response = {"status": "success", "message": "Контент успешно сохранен"}
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/execute-query':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            result = self.db.execute_query(data['query'])
            self._set_headers('application/json')
            self.wfile.write(json.dumps(result).encode())

        elif self.path == '/create-table':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            result = self.db.create_table(data['name'], data['columns'])
            self._set_headers('application/json')
            self.wfile.write(json.dumps(result).encode())

        elif self.path == '/save-chat-message':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            if self.db.save_chat_message(data['sender'], data['message']):
                self._set_headers('application/json')
                response = {
                    "status": "success",
                    "message": "Сообщение сохранено"
                }
            else:
                self.send_response(400)
                self._set_headers('application/json')
                response = {
                    "status": "error",
                    "message": "Ошибка при сохранении сообщения"
                }
            
            self.wfile.write(json.dumps(response).encode())

    def _check_auth(self):
        # Добавляем отладочную информацию
        auth_header = self.headers.get('Authorization')
        print(f"Auth header: {auth_header}")
        
        if not auth_header:
            return False
        
        try:
            token = auth_header.split(' ')[1]
            username, timestamp = token.split(':')
            timestamp = int(timestamp)
            
            # Добавляем отладочную информацию
            print(f"Token: {token}")
            print(f"Username: {username}")
            print(f"Timestamp: {timestamp}")
            print(f"Current time: {time.time()}")
            print(f"Active sessions: {self.active_sessions}")
            
            if time.time() - timestamp > 86400:
                print("Token expired")
                return False
                
            if username in self.active_sessions and self.active_sessions[username] == token:
                print("Auth successful")
                return True
                
            print("Auth failed")
            return False
        except Exception as e:
            print(f"Auth error: {str(e)}")
            return False

    def _get_content_type(self, path):
        extensions = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json'
        }
        return extensions.get(os.path.splitext(path)[1], 'text/plain')

def run_server(port=8090):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"Сервер запущен на порту {port}")
    print(f'Откройте браузер и перейдите по адресу http://localhost:{port}')
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
