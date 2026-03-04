// Login/Register JavaScript

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // Check if user is admin
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        });
    }
});

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show/Hide forms
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
}

function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.remove('hidden');
}

// Show alert
function showAlert(elementId, message, type = 'danger') {
    const alertDiv = document.getElementById(elementId);
    alertDiv.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        </div>
    `;
    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 5000);
}

// Show/Hide loading
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}

// Login form submission
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading(true);
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user data
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showLoading(false);
            
            // Redirect based on role
            if (userData.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            showLoading(false);
            showAlert('loginAlert', 'User data not found. Please contact support.');
        }
    } catch (error) {
        showLoading(false);
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
        }
        
        showAlert('loginAlert', errorMessage);
    }
});

// Register form submission
document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('registerEmail').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const transferPin = document.getElementById('transferPin').value;
    
    // Validation
    if (password !== confirmPassword) {
        showAlert('registerAlert', 'Passwords do not match.');
        return;
    }
    
    if (transferPin.length !== 4 || !/^\d{4}$/.test(transferPin)) {
        showAlert('registerAlert', 'Transfer PIN must be exactly 4 digits.');
        return;
    }
    
    showLoading(true);
    
    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phoneNumber: phoneNumber,
            balance: 0,
            transferPin: transferPin,
            role: 'user',
            accountNumber: generateAccountNumber(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        
        // Create welcome notification
        await db.collection('notifications').add({
            userId: user.uid,
            title: 'Welcome to City Bank!',
            message: 'Your account has been created successfully. Start banking with us today!',
            type: 'welcome',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showLoading(false);
        showAlert('registerAlert', 'Account created successfully! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        showLoading(false);
        let errorMessage = 'Registration failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Use at least 6 characters.';
                break;
        }
        
        showAlert('registerAlert', errorMessage);
    }
});

// Forgot password form submission
document.getElementById('forgotFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    showLoading(true);
    
    try {
        await auth.sendPasswordResetEmail(email);
        showLoading(false);
        showAlert('forgotAlert', 'Password reset email sent! Check your inbox.', 'success');
        setTimeout(() => {
            showLogin();
        }, 3000);
    } catch (error) {
        showLoading(false);
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
        }
        
        showAlert('forgotAlert', errorMessage);
    }
});

// Generate account number
function generateAccountNumber() {
    return 'CB' + Date.now().toString().slice(-10) + Math.random().toString(36).substr(2, 4).toUpperCase();
}
