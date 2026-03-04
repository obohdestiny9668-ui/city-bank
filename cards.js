// cards.js
// Clock
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

// Load user data
function loadUserData() {
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'user', cardNumber: '3061' };
    document.getElementById('cardHolderName').textContent = user.name.split(' ')[0];
    document.getElementById('cardLast4').textContent = user.cardNumber;
}

loadUserData();

// Card carousel
let currentCard = 0;
const cards = document.querySelectorAll('.bank-card');

function goToCard(index) {
    currentCard = index;
    const wrapper = document.getElementById('cardsWrapper');
    wrapper.scrollTo({ left: index * wrapper.offsetWidth, behavior: 'smooth' });
    
    document.querySelectorAll('.card-dots .dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Touch support
let touchStartX = 0;
let touchEndX = 0;

document.getElementById('cardsWrapper').addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.getElementById('cardsWrapper').addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (touchEndX < touchStartX - 50 && currentCard < cards.length - 1) {
        goToCard(currentCard + 1);
    }
    if (touchEndX > touchStartX + 50 && currentCard > 0) {
        goToCard(currentCard - 1);
    }
}

// Modal functions
function showAddCard() {
    document.getElementById('addCardModal').classList.add('active');
}

function showCardDetails() {
    document.getElementById('cardDetailsModal').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function requestCard(type) {
    alert(`Your ${type} card request has been submitted!`);
    closeModal('addCardModal');
}

// Card actions
function freezeCard() {
    alert('Card temporarily frozen. You can unfreeze it anytime.');
}

function changePin() {
    const newPin = prompt('Enter new 4-digit PIN:');
    if (newPin && newPin.length === 4 && /^\d+$/.test(newPin)) {
        alert('PIN changed successfully!');
    } else {
        alert('Invalid PIN. Please enter 4 digits.');
    }
}

function reportLost() {
    if (confirm('Are you sure you want to report this card lost/stolen?')) {
        alert('Card has been blocked. A replacement will be sent to you.');
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
}

// Toggle CVV
let cvvVisible = false;
function toggleCVV() {
    cvvVisible = !cvvVisible;
    const cvvValue = document.getElementById('cvvValue');
    const cvvEye = document.getElementById('cvvEye');
    
    if (cvvVisible) {
        cvvValue.textContent = '123';
        cvvEye.classList.remove('fa-eye');
        cvvEye.classList.add('fa-eye-slash');
    } else {
        cvvValue.textContent = '•••';
        cvvEye.classList.remove('fa-eye-slash');
        cvvEye.classList.add('fa-eye');
    }
}

// Close modals on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('light-theme');
}
