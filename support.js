// support.js
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
    const user = JSON.parse(localStorage.getItem('user')) || {
        name: 'User User',
        email: 'user@cityprime.com'
    };
    
    document.getElementById('supportName').value = user.name;
    document.getElementById('supportEmail').value = user.email;
}

loadUserData();

// File upload
const fileUpload = document.getElementById('fileUpload');
const fileInput = document.getElementById('attachment');
const fileName = document.getElementById('fileName');

fileUpload.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
        fileName.textContent = fileInput.files[0].name;
        fileName.style.display = 'block';
        fileUpload.style.display = 'none';
    }
});

// FAQ toggle
function toggleFaq(button) {
    const faqItem = button.parentElement;
    faqItem.classList.toggle('active');
}

// Form submission
document.getElementById('supportForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Show success modal
    document.getElementById('successModal').classList.add('active');
    
    // Reset form
    this.reset();
    fileName.style.display = 'none';
    fileUpload.style.display = 'block';
    loadUserData();
});

function closeModal() {
    document.getElementById('successModal').classList.remove('active');
}

// Close modal on outside click
document.getElementById('successModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('light-theme');
}
