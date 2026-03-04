// Admin Dashboard JavaScript

let currentUser = null;
let userData = null;

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
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'index.html';
    }
}

// Load dashboard data
async function loadDashboardData() {
    showLoading(true);
    
    try {
        // Load stats
        await Promise.all([
            loadUserStats(),
            loadTransactionStats(),
            loadChatStats(),
            loadRecentUsers(),
            loadRecentTransactions()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
    
    showLoading(false);
}

// Load user stats
async function loadUserStats() {
    try {
        const snapshot = await db.collection('users').get();
        let totalBalance = 0;
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.role !== 'admin') {
                totalBalance += user.balance || 0;
            }
        });
        
        document.getElementById('totalUsers').textContent = snapshot.size;
        document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Load transaction stats
async function loadTransactionStats() {
    try {
        const snapshot = await db.collection('transactions').get();
        document.getElementById('totalTransactions').textContent = snapshot.size;
    } catch (error) {
        console.error('Error loading transaction stats:', error);
    }
}

// Load chat stats
async function loadChatStats() {
    try {
        const snapshot = await db.collection('chats').get();
        document.getElementById('activeChats').textContent = snapshot.size;
    } catch (error) {
        console.error('Error loading chat stats:', error);
    }
}

// Load recent users
async function loadRecentUsers() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'user')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const tbody = document.getElementById('recentUsersTable');
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No users found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = snapshot.docs.map((doc) => {
            const user = doc.data();
            return `
                <tr>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
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
                            <a href="admin-users.html?user=${doc.id}" class="btn btn-primary btn-sm" title="Manage">
                                <i class="fas fa-cog"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent users:', error);
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const snapshot = await db.collection('transactions')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const tbody = document.getElementById('recentTransactionsTable');
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No transactions found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = snapshot.docs.map((doc) => {
            const txn = doc.data();
            return `
                <tr>
                    <td>${formatDate(txn.createdAt)}</td>
                    <td>${txn.transactionId}</td>
                    <td>${txn.senderName || txn.senderEmail}</td>
                    <td>${txn.receiverName || txn.receiverEmail}</td>
                    <td>${formatCurrency(txn.amount)}</td>
                    <td>
                        <span class="badge badge-${txn.status === 'completed' ? 'success' : 'warning'}">
                            ${txn.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

// Show add balance modal
function showAddBalanceModal() {
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
    
    const email = document.getElementById('balanceUserEmail').value.trim();
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    const description = document.getElementById('balanceDescription').value.trim();
    
    showLoading(true);
    
    try {
        // Find user by email
        const userSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (userSnapshot.empty) {
            showLoading(false);
            showAlert('addBalanceAlert', 'User not found with this email.', 'danger');
            return;
        }
        
        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Update user balance
        await db.collection('users').doc(userId).update({
            balance: firebase.firestore.FieldValue.increment(amount)
        });
        
        // Create transaction record
        const transactionId = generateTransactionId();
        await db.collection('transactions').doc(transactionId).set({
            transactionId: transactionId,
            senderId: 'admin',
            senderName: 'City Bank Admin',
            senderEmail: 'admin@citybank.com',
            receiverId: userId,
            receiverName: `${userData.firstName} ${userData.lastName}`,
            receiverEmail: userData.email,
            amount: amount,
            description: description || 'Admin balance addition',
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create notification
        await db.collection('notifications').add({
            userId: userId,
            title: 'Balance Added!',
            message: `${formatCurrency(amount)} has been added to your account by admin.`,
            type: 'balance',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showLoading(false);
        showAlert('addBalanceAlert', `Successfully added ${formatCurrency(amount)} to ${userData.firstName}'s account!`, 'success');
        
        setTimeout(() => {
            closeAddBalanceModal();
            loadDashboardData();
        }, 2000);
        
    } catch (error) {
        showLoading(false);
        console.error('Error adding balance:', error);
        showAlert('addBalanceAlert', 'Failed to add balance. Please try again.', 'danger');
    }
});

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
