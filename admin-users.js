// Admin Users JavaScript

let currentUser = null;
let userData = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 10;
let selectedUserId = null;
let selectedUserData = null;

// Check authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        checkAdminAccess();
    } else {
        window.location.href = 'index.html';
    }
});

// Check admin access
async function checkAdminAccess() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            userData = doc.data();
            if (userData.role !== 'admin') {
                alert('Access denied. Admin privileges required.');
                window.location.href = 'dashboard.html';
                return;
            }
            document.getElementById('adminName').textContent = `${userData.firstName} ${userData.lastName}`;
            loadUsers();
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'index.html';
    }
}

// Load users
async function loadUsers() {
    showLoading(true);
    
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'user')
            .get();
        
        allUsers = [];
        snapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by createdAt (newest first)
        allUsers.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        
        filteredUsers = [...allUsers];
        
        showLoading(false);
        renderUsers();
        
    } catch (error) {
        showLoading(false);
        console.error('Error loading users:', error);
    }
}

// Apply filters
function applyFilters() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    filteredUsers = allUsers.filter((user) => {
        // Search filter
        if (searchQuery) {
            const searchFields = [
                user.firstName,
                user.lastName,
                user.email,
                user.accountNumber,
                user.phoneNumber
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchQuery)) {
                return false;
            }
        }
        
        // Status filter
        if (statusFilter !== 'all' && user.status !== statusFilter) {
            return false;
        }
        
        return true;
    });
    
    // Sort
    switch (sortBy) {
        case 'newest':
            filteredUsers.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });
            break;
        case 'oldest':
            filteredUsers.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });
            break;
        case 'balanceHigh':
            filteredUsers.sort((a, b) => (b.balance || 0) - (a.balance || 0));
            break;
        case 'balanceLow':
            filteredUsers.sort((a, b) => (a.balance || 0) - (b.balance || 0));
            break;
    }
    
    currentPage = 1;
    renderUsers();
}

// Render users table
function renderUsers() {
    const tbody = document.getElementById('usersTable');
    document.getElementById('userCount').textContent = `${filteredUsers.length} users`;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No users found</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = filteredUsers.slice(start, end);
    
    tbody.innerHTML = pageUsers.map((user) => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar-small">${user.firstName[0]}${user.lastName[0]}</div>
                    <div class="user-info">
                        <span class="user-name">${user.firstName} ${user.lastName}</span>
                        <span class="user-email">${user.email}</span>
                    </div>
                </div>
            </td>
            <td>${user.accountNumber || 'N/A'}</td>
            <td>${formatCurrency(user.balance || 0)}</td>
            <td>
                <span class="badge badge-${user.status === 'active' ? 'success' : 'danger'}">
                    ${user.status || 'Active'}
                </span>
            </td>
            <td>${user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="user-actions">
                    <button class="btn btn-primary btn-sm" onclick="openUserActions('${user.id}')" title="Manage">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Update pagination
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
    document.getElementById('pagination').style.display = totalPages > 1 ? 'flex' : 'none';
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderUsers();
    }
}

// Open user actions modal
async function openUserActions(userId) {
    selectedUserId = userId;
    
    showLoading(true);
    
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            selectedUserData = doc.data();
            
            document.getElementById('modalUserInfo').innerHTML = `
                <div class="user-avatar-large">${selectedUserData.firstName[0]}${selectedUserData.lastName[0]}</div>
                <h4>${selectedUserData.firstName} ${selectedUserData.lastName}</h4>
                <p>${selectedUserData.email}</p>
                <div class="user-stats-row">
                    <div class="user-stat">
                        <span class="value">${formatCurrency(selectedUserData.balance || 0)}</span>
                        <span class="label">Balance</span>
                    </div>
                    <div class="user-stat">
                        <span class="value">${selectedUserData.accountNumber || 'N/A'}</span>
                        <span class="label">Account</span>
                    </div>
                </div>
            `;
            
            document.getElementById('suspendBtnText').textContent = 
                selectedUserData.status === 'suspended' ? 'Activate User' : 'Suspend User';
            
            document.getElementById('userActionsModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
    
    showLoading(false);
}

// Close user actions modal
function closeUserActionsModal() {
    document.getElementById('userActionsModal').classList.remove('active');
    selectedUserId = null;
    selectedUserData = null;
}

// Show add balance modal
function showAddBalanceToUser() {
    closeUserActionsModal();
    document.getElementById('addBalanceModal').classList.add('active');
}

// Close add balance modal
function closeAddBalanceModal() {
    document.getElementById('addBalanceModal').classList.remove('active');
    document.getElementById('addBalanceForm').reset();
    document.getElementById('addBalanceAlert').innerHTML = '';
}

// Add balance form submission
document.getElementById('addBalanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('addBalanceAmount').value);
    const description = document.getElementById('addBalanceDescription').value.trim();
    
    showLoading(true);
    
    try {
        await db.collection('users').doc(selectedUserId).update({
            balance: firebase.firestore.FieldValue.increment(amount)
        });
        
        // Create transaction
        const transactionId = generateTransactionId();
        await db.collection('transactions').doc(transactionId).set({
            transactionId: transactionId,
            senderId: 'admin',
            senderName: 'City Bank Admin',
            senderEmail: 'admin@citybank.com',
            receiverId: selectedUserId,
            receiverName: `${selectedUserData.firstName} ${selectedUserData.lastName}`,
            receiverEmail: selectedUserData.email,
            amount: amount,
            description: description || 'Admin balance addition',
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create notification
        await db.collection('notifications').add({
            userId: selectedUserId,
            title: 'Balance Added!',
            message: `${formatCurrency(amount)} has been added to your account by admin.`,
            type: 'balance',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showLoading(false);
        showAlert('addBalanceAlert', `Successfully added ${formatCurrency(amount)}!`, 'success');
        
        setTimeout(() => {
            closeAddBalanceModal();
            loadUsers();
        }, 1500);
        
    } catch (error) {
        showLoading(false);
        console.error('Error adding balance:', error);
        showAlert('addBalanceAlert', 'Failed to add balance.', 'danger');
    }
});

// Show subtract balance modal
function showSubtractBalance() {
    closeUserActionsModal();
    document.getElementById('subtractBalanceModal').classList.add('active');
}

// Close subtract balance modal
function closeSubtractBalanceModal() {
    document.getElementById('subtractBalanceModal').classList.remove('active');
    document.getElementById('subtractBalanceForm').reset();
    document.getElementById('subtractBalanceAlert').innerHTML = '';
}

// Subtract balance form submission
document.getElementById('subtractBalanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('subtractBalanceAmount').value);
    const description = document.getElementById('subtractBalanceDescription').value.trim();
    
    if (amount > (selectedUserData.balance || 0)) {
        showAlert('subtractBalanceAlert', 'Amount exceeds user balance.', 'danger');
        return;
    }
    
    showLoading(true);
    
    try {
        await db.collection('users').doc(selectedUserId).update({
            balance: firebase.firestore.FieldValue.increment(-amount)
        });
        
        // Create transaction
        const transactionId = generateTransactionId();
        await db.collection('transactions').doc(transactionId).set({
            transactionId: transactionId,
            senderId: selectedUserId,
            senderName: `${selectedUserData.firstName} ${selectedUserData.lastName}`,
            senderEmail: selectedUserData.email,
            receiverId: 'admin',
            receiverName: 'City Bank Admin',
            receiverEmail: 'admin@citybank.com',
            amount: amount,
            description: description || 'Admin balance deduction',
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create notification
        await db.collection('notifications').add({
            userId: selectedUserId,
            title: 'Balance Deducted',
            message: `${formatCurrency(amount)} has been deducted from your account by admin.`,
            type: 'balance',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showLoading(false);
        showAlert('subtractBalanceAlert', `Successfully subtracted ${formatCurrency(amount)}!`, 'success');
        
        setTimeout(() => {
            closeSubtractBalanceModal();
            loadUsers();
        }, 1500);
        
    } catch (error) {
        showLoading(false);
        console.error('Error subtracting balance:', error);
        showAlert('subtractBalanceAlert', 'Failed to subtract balance.', 'danger');
    }
});

// Show reset PIN modal
function showResetPin() {
    closeUserActionsModal();
    document.getElementById('resetPinModal').classList.add('active');
}

// Close reset PIN modal
function closeResetPinModal() {
    document.getElementById('resetPinModal').classList.remove('active');
    document.getElementById('resetPinForm').reset();
    document.getElementById('resetPinAlert').innerHTML = '';
}

// Reset PIN form submission
document.getElementById('resetPinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPin = document.getElementById('newUserPin').value;
    
    showLoading(true);
    
    try {
        await db.collection('users').doc(selectedUserId).update({
            transferPin: newPin
        });
        
        // Create notification
        await db.collection('notifications').add({
            userId: selectedUserId,
            title: 'PIN Reset',
            message: 'Your transfer PIN has been reset by admin. Please contact support for your new PIN.',
            type: 'security',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showLoading(false);
        showAlert('resetPinAlert', 'PIN reset successfully!', 'success');
        
        setTimeout(() => {
            closeResetPinModal();
        }, 1500);
        
    } catch (error) {
        showLoading(false);
        console.error('Error resetting PIN:', error);
        showAlert('resetPinAlert', 'Failed to reset PIN.', 'danger');
    }
});

// Toggle user status
async function toggleUserStatus() {
    const newStatus = selectedUserData.status === 'suspended' ? 'active' : 'suspended';
    
    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        await db.collection('users').doc(selectedUserId).update({
            status: newStatus
        });
        
        // Create notification
        await db.collection('notifications').add({
            userId: selectedUserId,
            title: newStatus === 'suspended' ? 'Account Suspended' : 'Account Activated',
            message: newStatus === 'suspended' 
                ? 'Your account has been suspended. Please contact support.' 
                : 'Your account has been activated. You can now use all features.',
            type: 'account',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showLoading(false);
        closeUserActionsModal();
        loadUsers();
        
    } catch (error) {
        showLoading(false);
        console.error('Error toggling user status:', error);
        alert('Failed to update user status.');
    }
}

// View user transactions
function viewUserTransactions() {
    window.location.href = `admin-transactions.html?user=${selectedUserId}`;
}

// Chat with user
function chatWithUser() {
    window.location.href = `admin-chat.html?user=${selectedUserId}`;
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
}

// Show loading
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}
