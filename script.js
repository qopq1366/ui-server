document.addEventListener('DOMContentLoaded', function() {
    const welcome = document.querySelector('h1');
    welcome.addEventListener('click', function() {
        alert('Привет! Спасибо за клик!');
    });

    // Добавляем эффект параллакса
    document.addEventListener('mousemove', function(e) {
        const cards = document.querySelectorAll('.feature-card');
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cardX = rect.left + rect.width / 2;
            const cardY = rect.top + rect.height / 2;

            const angleX = (mouseY - cardY) / 30;
            const angleY = (mouseX - cardX) / -30;

            card.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg)`;
        });
    });

    // Возвращаем карточки в исходное положение
    document.addEventListener('mouseleave', function() {
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
            card.style.transform = 'rotateX(0) rotateY(0)';
        });
    });
});

function showDemo() {
    alert('Демонстрация будет доступна в ближайшее время!');
}
