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

// Check if user is logged in
function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            if (!window.location.href.includes('index.html') && !window.location.href.includes('register.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generate transaction ID
function generateTransactionId() {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Generate receipt ID
function generateReceiptId() {
    return 'RCP' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
}
