// Profile JavaScript

let currentUser = null;
let userData = null;
let isEditingPersonal = false;

// Check authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
    } else {
        window.location.href = 'index.html';
    }
});

// Load user data
async function loadUserData() {
    showLoading(true);
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            userData = doc.data();
            
            // Update navigation
            document.getElementById('navUserName').textContent = `${userData.firstName} ${userData.lastName}`;
            
            // Update profile card
            document.getElementById('avatarInitials').textContent = `${userData.firstName[0]}${userData.lastName[0]}`;
            document.getElementById('profileName').textContent = `${userData.firstName} ${userData.lastName}`;
            document.getElementById('profileEmail').textContent = userData.email;
            document.getElementById('profileBalance').textContent = formatCurrency(userData.balance || 0);
            document.getElementById('profileJoinDate').textContent = userData.createdAt 
                ? userData.createdAt.toDate().toLocaleDateString() 
                : 'N/A';
            
            // Update personal info form
            document.getElementById('firstName').value = userData.firstName;
            document.getElementById('lastName').value = userData.lastName;
            document.getElementById('email').value = userData.email;
            document.getElementById('phoneNumber').value = userData.phoneNumber || '';
            document.getElementById('accountNumber').value = userData.accountNumber || 'N/A';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
    
    showLoading(false);
}

// Show section
function showSection(section) {
    // Hide all sections
    document.getElementById('personalSection').classList.add('hidden');
    document.getElementById('securitySection').classList.add('hidden');
    document.getElementById('accountSection').classList.add('hidden');
    
    // Show selected section
    document.getElementById(section + 'Section').classList.remove('hidden');
    
    // Update menu
    document.querySelectorAll('.menu-item').forEach((item) => {
        item.classList.remove('active');
    });
    event.target.closest('.menu-item').classList.add('active');
}

// Toggle edit mode
function toggleEdit(section) {
    isEditingPersonal = true;
    
    document.getElementById('firstName').disabled = false;
    document.getElementById('lastName').disabled = false;
    document.getElementById('phoneNumber').disabled = false;
    document.getElementById('personalActions').style.display = 'flex';
}

// Cancel edit
function cancelEdit(section) {
    isEditingPersonal = false;
    
    document.getElementById('firstName').disabled = true;
    document.getElementById('lastName').disabled = true;
    document.getElementById('phoneNumber').disabled = true;
    document.getElementById('personalActions').style.display = 'none';
    
    // Reset values
    document.getElementById('firstName').value = userData.firstName;
    document.getElementById('lastName').value = userData.lastName;
    document.getElementById('phoneNumber').value = userData.phoneNumber || '';
}

// Personal form submission
document.getElementById('personalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isEditingPersonal) return;
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    
    showLoading(true);
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber
        });
        
        // Update local data
        userData.firstName = firstName;
        userData.lastName = lastName;
        userData.phoneNumber = phoneNumber;
        
        // Update UI
        document.getElementById('navUserName').textContent = `${firstName} ${lastName}`;
        document.getElementById('avatarInitials').textContent = `${firstName[0]}${lastName[0]}`;
        document.getElementById('profileName').textContent = `${firstName} ${lastName}`;
        
        cancelEdit('personal');
        showAlert('personalAlert', 'Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('personalAlert', 'Failed to update profile. Please try again.', 'danger');
    }
    
    showLoading(false);
});

// Password form submission
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showAlert('passwordAlert', 'New passwords do not match.', 'danger');
        return;
    }
    
    showLoading(true);
    
    try {
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        await currentUser.reauthenticateWithCredential(credential);
        
        // Update password
        await currentUser.updatePassword(newPassword);
        
        document.getElementById('passwordForm').reset();
        showAlert('passwordAlert', 'Password updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating password:', error);
        let message = 'Failed to update password.';
        if (error.code === 'auth/wrong-password') {
            message = 'Current password is incorrect.';
        }
        showAlert('passwordAlert', message, 'danger');
    }
    
    showLoading(false);
});

// PIN form submission
document.getElementById('pinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPin = document.getElementById('currentPin').value;
    const newPin = document.getElementById('newPin').value;
    const confirmNewPin = document.getElementById('confirmNewPin').value;
    
    if (newPin !== confirmNewPin) {
        showAlert('pinAlert', 'New PINs do not match.', 'danger');
        return;
    }
    
    if (currentPin !== userData.transferPin) {
        showAlert('pinAlert', 'Current PIN is incorrect.', 'danger');
        return;
    }
    
    showLoading(true);
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            transferPin: newPin
        });
        
        userData.transferPin = newPin;
        document.getElementById('pinForm').reset();
        showAlert('pinAlert', 'Transfer PIN updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating PIN:', error);
        showAlert('pinAlert', 'Failed to update PIN. Please try again.', 'danger');
    }
    
    showLoading(false);
});

// Delete account
async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }
    
    const confirmText = prompt('Please type "DELETE" to confirm account deletion:');
    if (confirmText !== 'DELETE') {
        alert('Account deletion cancelled.');
        return;
    }
    
    showLoading(true);
    
    try {
        // Delete user data
        await db.collection('users').doc(currentUser.uid).delete();
        
        // Delete user auth
        await currentUser.delete();
        
        window.location.href = 'index.html';
    } catch (error) {
        showLoading(false);
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
    }
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

// Show loading
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}
