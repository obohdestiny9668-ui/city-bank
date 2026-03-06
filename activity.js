// activity.js
// Clock
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

// Global variables
let allTransactions = [];
let currentUser = null;

// Check auth and load transactions
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        currentUser = user;
        loadTransactions(user.uid);
        loadNotificationCount(user.uid);
    }
});

// Load transactions from Firebase
async function loadTransactions(uid) {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const transactionSections = document.getElementById('transactionSections');
    const summarySection = document.getElementById('summarySection');

    try {
        loadingState.classList.remove('hidden');
        transactionSections.classList.add('hidden');
        summarySection.classList.add('hidden');

        // Get user's transactions (both sent and received)
        const sentSnapshot = await db.collection('transactions')
            .where('senderId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        const receivedSnapshot = await db.collection('transactions')
            .where('receiverId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        allTransactions = [];

        // Process sent transactions (expenses)
        sentSnapshot.forEach(doc => {
            const data = doc.data();
            allTransactions.push({
                id: doc.id,
                ...data,
                type: 'expense',
                displayName: data.receiverName || 'Unknown',
                displayDescription: data.description || 'Transfer Sent'
            });
        });

        // Process received transactions (income)
        receivedSnapshot.forEach(doc => {
            const data = doc.data();
            allTransactions.push({
                id: doc.id,
                ...data,
                type: 'income',
                displayName: data.senderName || 'Unknown',
                displayDescription: data.description || 'Transfer Received'
            });
        });

        // Sort by date (newest first)
        allTransactions.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB - dateA;
        });

        loadingState.classList.add('hidden');

        if (allTransactions.length === 0) {
            emptyState.classList.remove('hidden');
            transactionSections.classList.add('hidden');
            summarySection.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            transactionSections.classList.remove('hidden');
            summarySection.classList.remove('hidden');
            renderTransactions(allTransactions);
            updateSummary(allTransactions);
        }

    } catch (error) {
        console.error('Error loading transactions:', error);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        showToast('Error loading transactions', 'error');
    }
}

// Render transactions grouped by date
function renderTransactions(transactions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const todayList = document.getElementById('todayList');
    const yesterdayList = document.getElementById('yesterdayList');
    const thisWeekList = document.getElementById('thisWeekList');
    const thisMonthList = document.getElementById('thisMonthList');
    const olderList = document.getElementById('olderList');

    // Clear lists
    todayList.innerHTML = '';
    yesterdayList.innerHTML = '';
    thisWeekList.innerHTML = '';
    thisMonthList.innerHTML = '';
    olderList.innerHTML = '';

    // Hide all sections initially
    document.getElementById('todaySection').style.display = 'none';
    document.getElementById('yesterdaySection').style.display = 'none';
    document.getElementById('thisWeekSection').style.display = 'none';
    document.getElementById('thisMonthSection').style.display = 'none';
    document.getElementById('olderSection').style.display = 'none';

    transactions.forEach(transaction => {
        const transactionDate = transaction.createdAt?.toDate?.() || new Date(transaction.createdAt);
        const html = createTransactionHTML(transaction);

        if (transactionDate >= today) {
            todayList.innerHTML += html;
            document.getElementById('todaySection').style.display = 'block';
        } else if (transactionDate >= yesterday) {
            yesterdayList.innerHTML += html;
            document.getElementById('yesterdaySection').style.display = 'block';
        } else if (transactionDate >= weekAgo) {
            thisWeekList.innerHTML += html;
            document.getElementById('thisWeekSection').style.display = 'block';
        } else if (transactionDate >= monthAgo) {
            thisMonthList.innerHTML += html;
            document.getElementById('thisMonthSection').style.display = 'block';
        } else {
            olderList.innerHTML += html;
            document.getElementById('olderSection').style.display = 'block';
        }
    });

    // Add click handlers
    document.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', () => {
            const txnId = item.dataset.id;
            window.location.href = `receipt.html?txn=${txnId}`;
        });
    });
}

// Create transaction HTML
function createTransactionHTML(transaction) {
    const date = transaction.createdAt?.toDate?.() || new Date(transaction.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const icon = getTransactionIcon(transaction.transferType);
    const amountClass = transaction.type === 'income' ? 'income' : 'expense';
    const amountPrefix = transaction.type === 'income' ? '+' : '-';

    return `
        <div class="transaction-item" data-type="${transaction.type}" data-id="${transaction.id}">
            <div class="transaction-icon ${amountClass}">
                <i class="${icon}"></i>
            </div>
            <div class="transaction-info">
                <h4>${transaction.displayName}</h4>
                <p>${transaction.displayDescription}</p>
                <span class="time">${formattedDate}, ${formattedTime}</span>
            </div>
            <div class="transaction-amount ${amountClass}">${amountPrefix}${formatCurrency(transaction.amount)}</div>
        </div>
    `;
}

// Get icon based on transfer type
function getTransactionIcon(type) {
    const icons = {
        'local': 'fas fa-exchange-alt',
        'wire': 'fas fa-university',
        'crypto': 'fab fa-bitcoin',
        'paypal': 'fab fa-paypal',
        'wise': 'fas fa-exchange-alt',
        'cashapp': 'fas fa-dollar-sign',
        'skrill': 'fas fa-wallet',
        'venmo': 'fas fa-hand-holding-usd',
        'zelle': 'fas fa-bolt',
        'revolut': 'fas fa-credit-card',
        'alipay': 'fas fa-qrcode',
        'wechat': 'fas fa-comment'
    };
    return icons[type] || 'fas fa-exchange-alt';
}

// Update summary cards
function updateSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(txn => {
        if (txn.type === 'income') {
            totalIncome += parseFloat(txn.amount) || 0;
        } else {
            totalExpense += parseFloat(txn.amount) || 0;
        }
    });

    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
}

// Filter activity
function filterActivity(type) {
    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter and re-render
    if (type === 'all') {
        renderTransactions(allTransactions);
    } else {
        const filtered = allTransactions.filter(t => t.type === type);
        renderTransactions(filtered);
    }
}

// Search transactions
function searchTransactions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderTransactions(allTransactions);
        return;
    }

    const filtered = allTransactions.filter(txn => {
        return (
            txn.displayName?.toLowerCase().includes(searchTerm) ||
            txn.displayDescription?.toLowerCase().includes(searchTerm) ||
            txn.transactionId?.toLowerCase().includes(searchTerm) ||
            txn.receiptId?.toLowerCase().includes(searchTerm) ||
            txn.amount?.toString().includes(searchTerm)
        );
    });

    renderTransactions(filtered);
}

// Load notification count
async function loadNotificationCount(uid) {
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .where('read', '==', false)
            .get();
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = snapshot.size;
            badge.style.display = snapshot.size > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('light-theme');
}

// Loading spinner styles
const style = document.createElement('style');
style.textContent = `
    .loading-state {
        text-align: center;
        padding: 3rem;
        color: var(--gray);
    }
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(14, 165, 233, 0.2);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: var(--gray);
    }
    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    .empty-state h3 {
        font-size: 1.125rem;
        margin-bottom: 0.5rem;
    }
    .empty-state p {
        font-size: 0.875rem;
        opacity: 0.7;
    }
    .hidden {
        display: none !important;
    }
    .transaction-item {
        cursor: pointer;
        transition: all 0.3s;
    }
    .transaction-item:hover {
        background: rgba(30, 41, 59, 0.8);
        transform: translateX(4px);
    }
`;
document.head.appendChild(style);
