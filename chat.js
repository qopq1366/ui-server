class Chat {
    constructor() {
        this.messages = [];
        this.socket = null;
        this.init();
    }

    init() {
        // Создаем и добавляем элемент чата
        const chatHtml = `
            <div class="chat-widget">
                <div class="chat-header">
                    <span>Онлайн чат</span>
                    <button class="chat-toggle">▼</button>
                </div>
                <div class="chat-body">
                    <div class="chat-messages"></div>
                    <div class="chat-input">
                        <input type="text" placeholder="Введите сообщение...">
                        <button>Отправить</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHtml);

        // Инициализируем WebSocket
        this.socket = new WebSocket(`ws://${window.location.hostname}:8091`);
        this.socket.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
        
        // Добавляем обработчики событий
        const toggle = document.querySelector('.chat-toggle');
        toggle.addEventListener('click', () => this.toggleChat());
        
        const input = document.querySelector('.chat-input input');
        const send = document.querySelector('.chat-input button');
        
        send.addEventListener('click', () => this.sendMessage(input.value));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage(input.value);
        });
    }

    toggleChat() {
        const body = document.querySelector('.chat-body');
        const toggle = document.querySelector('.chat-toggle');
        body.classList.toggle('hidden');
        toggle.textContent = body.classList.contains('hidden') ? '▲' : '▼';
    }

    sendMessage(text) {
        if (!text.trim()) return;
        
        const input = document.querySelector('.chat-input input');
        this.socket.send(JSON.stringify({
            type: 'message',
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString()
        }));
        input.value = '';
    }

    handleMessage(data) {
        const messages = document.querySelector('.chat-messages');
        const messageHtml = `
            <div class="chat-message ${data.sender}">
                <div class="message-content">${data.text}</div>
                <div class="message-time">${new Date(data.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
        messages.insertAdjacentHTML('beforeend', messageHtml);
        messages.scrollTop = messages.scrollHeight;
    }
}

// Инициализируем чат при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new Chat();
});
