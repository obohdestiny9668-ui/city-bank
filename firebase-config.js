// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdYEoaAi4tfJDqaj7tht923EyTqvTtZ0I",
    authDomain: "city-babk.firebaseapp.com",
    projectId: "city-babk",
    storageBucket: "city-babk.firebasestorage.app",
    messagingSenderId: "792385054611",
    appId: "1:792385054611:web:f2c8c4c4d323cb6ef2a66",
    measurementId: "G-NZK8VRJLED"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Current user data
let currentUser = null;
let userData = null;

// Check auth state
auth.onAuthStateChanged((user) => {

    currentUser = user;

    if (user) {
        loadUserData(user.uid);
    } else {
        userData = null;
    }

});

// Load user data
async function loadUserData(uid) {

    try {

        const doc = await db.collection('users').doc(uid).get();

        if (doc.exists) {
            userData = doc.data();
            updateUIWithUserData();
        }

    } catch (error) {

        console.error('Error loading user data:', error);

    }

}

// Update UI with user data
function updateUIWithUserData() {

    // Update balance displays
    const balanceElements = document.querySelectorAll('.balance-amount, .user-balance');

    balanceElements.forEach(el => {

        if (userData && userData.balance !== undefined) {
            el.textContent = formatCurrency(userData.balance);
        }

    });

    // Update user name
    const nameElements = document.querySelectorAll('.user-name-display');

    nameElements.forEach(el => {

        if (userData) {
            el.textContent = `${userData.firstName} ${userData.lastName}`;
        }

    });

}

// Format currency
function formatCurrency(amount) {

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount || 0);

}

// Format date
function formatDate(timestamp) {

    if (!timestamp) return 'N/A';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

}

// Generate IDs
function generateTransactionId() {

    return 'TXN' + Date.now().toString().slice(-10) + Math.random().toString(36).substr(2, 6).toUpperCase();

}

function generateReceiptId() {

    return 'RCP' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();

}

function generateAccountNumber() {

    return '**** ' + Math.floor(1000 + Math.random() * 9000);

}


// Logout (UPDATED)
function logout() {

    // Clear OTP session data
    sessionStorage.removeItem("loginOTP");
    sessionStorage.removeItem("loginEmail");
    sessionStorage.removeItem("otpVerified");

    auth.signOut().then(() => {

        window.location.href = 'index.html';

    });

}


// Show toast notification
function showToast(message, type = 'success') {

    const toast = document.createElement('div');

    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {

        toast.classList.remove('show');

        setTimeout(() => toast.remove(), 300);

    }, 3000);

}