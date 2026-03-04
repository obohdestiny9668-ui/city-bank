// Dashboard JavaScript

let currentUser = null;
let userData = null;

// Check authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        loadStats();
        loadRecentTransactions();
        loadNotifications();
    } else {
        window.location.href = 'index.html';
    }
});

// Load user data
async function loadUserData() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            userData = doc.data();
            
            // Update UI
            document.getElementById('userName').textContent = `${userData.firstName} ${userData.lastName}`;
            document.getElementById('welcomeName').textContent = userData.firstName;
            document.getElementById('accountNumber').textContent = userData.accountNumber || 'N/A';
            document.getElementById('currentBalance').textContent = formatCurrency(userData.balance || 0);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        // Get all transactions
        const sentSnapshot = await db.collection('transactions')
            .where('senderId', '==', currentUser.uid)
            .get();
        
        const receivedSnapshot = await db.collection('transactions')
            .where('receiverId', '==', currentUser.uid)
            .get();
        
        let totalSent = 0;
        let totalReceived = 0;
        
        sentSnapshot.forEach((doc) => {
            const txn = doc.data();
            if (txn.status === 'completed') {
                totalSent += txn.amount;
            }
        });
        
        receivedSnapshot.forEach((doc) => {
            const txn = doc.data();
            if (txn.status === 'completed') {
                totalReceived += txn.amount;
            }
        });
        
        document.getElementById('totalSent').textContent = formatCurrency(totalSent);
        document.getElementById('totalReceived').textContent = formatCurrency(totalReceived);
        document.getElementById('transactionCount').textContent = sentSnapshot.size + receivedSnapshot.size;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const snapshot = await db.collection('transactions')
            .where('senderId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const receivedSnapshot = await db.collection('transactions')
            .where('receiverId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        let transactions = [];
        
        snapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data(), type: 'sent' });
        });
        
        receivedSnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data(), type: 'received' });
        });
        
        // Sort by date
        transactions.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        
        // Take top 5
        transactions = transactions.slice(0, 5);
        
        const tbody = document.getElementById('recentTransactions');
        
        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No transactions yet</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = transactions.map((txn) => {
            const isSent = txn.type === 'sent';
            const amountClass = isSent ? 'amount-negative' : 'amount-positive';
            const amountPrefix = isSent ? '-' : '+';
            const description = isSent 
                ? `Transfer to ${txn.receiverName || txn.receiverEmail || 'Unknown'}`
                : `Received from ${txn.senderName || txn.senderEmail || 'Unknown'}`;
            
            return `
                <tr>
                    <td>${formatDate(txn.createdAt)}</td>
                    <td>${description}</td>
                    <td>
                        <span class="badge badge-${isSent ? 'danger' : 'success'}">
                            ${isSent ? 'Sent' : 'Received'}
                        </span>
                    </td>
                    <td class="${amountClass}">${amountPrefix}${formatCurrency(txn.amount)}</td>
                    <td>
                        <span class="badge badge-${txn.status === 'completed' ? 'success' : 'warning'}">
                            ${txn.status || 'Pending'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        const container = document.getElementById('notificationsList');
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = snapshot.docs.map((doc) => {
            const notif = doc.data();
            const iconClass = notif.type === 'welcome' ? 'success' : 
                             notif.type === 'transfer' ? 'info' : 'warning';
            const icon = notif.type === 'welcome' ? 'fa-gift' : 
                        notif.type === 'transfer' ? 'fa-exchange-alt' : 'fa-bell';
            
            return `
                <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${doc.id}">
                    <div class="notification-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <h4>${notif.title}</h4>
                        <p>${notif.message}</p>
                        <span class="notification-time">${formatDate(notif.createdAt)}</span>
                    </div>
                    <div class="notification-actions">
                        ${!notif.read ? `<button onclick="markRead('${doc.id}')" title="Mark as read"><i class="fas fa-check"></i></button>` : ''}
                        <button onclick="deleteNotification('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Mark notification as read
async function markRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true
        });
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all notifications as read
async function markAllRead() {
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .where('read', '==', false)
            .get();
        
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
        loadNotifications();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// Delete notification
async function deleteNotification(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).delete();
        loadNotifications();
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

// Show loading
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}
