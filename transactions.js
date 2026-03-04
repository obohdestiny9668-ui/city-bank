// Transactions JavaScript

let currentUser = null;
let userData = null;
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 10;

// Check authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        loadTransactions();
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
            document.getElementById('userName').textContent = `${userData.firstName} ${userData.lastName}`;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load transactions
async function loadTransactions() {
    showLoading(true);
    
    try {
        // Get sent transactions
        const sentSnapshot = await db.collection('transactions')
            .where('senderId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        // Get received transactions
        const receivedSnapshot = await db.collection('transactions')
            .where('receiverId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        allTransactions = [];
        
        sentSnapshot.forEach((doc) => {
            allTransactions.push({ id: doc.id, ...doc.data(), type: 'sent' });
        });
        
        receivedSnapshot.forEach((doc) => {
            allTransactions.push({ id: doc.id, ...doc.data(), type: 'received' });
        });
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        
        filteredTransactions = [...allTransactions];
        
        showLoading(false);
        renderTransactions();
        
    } catch (error) {
        showLoading(false);
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsTable').innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading transactions. Please try again.</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Apply filters
function applyFilters() {
    const typeFilter = document.getElementById('filterType').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    filteredTransactions = allTransactions.filter((txn) => {
        // Type filter
        if (typeFilter !== 'all' && txn.type !== typeFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter !== 'all' && txn.status !== statusFilter) {
            return false;
        }
        
        // Date filters
        if (fromDate) {
            const txnDate = txn.createdAt ? txn.createdAt.toDate() : null;
            if (txnDate && txnDate < new Date(fromDate)) {
                return false;
            }
        }
        
        if (toDate) {
            const txnDate = txn.createdAt ? txn.createdAt.toDate() : null;
            if (txnDate && txnDate > new Date(toDate + 'T23:59:59')) {
                return false;
            }
        }
        
        // Search filter
        if (searchQuery) {
            const searchFields = [
                txn.transactionId,
                txn.receiptId,
                txn.senderName,
                txn.senderEmail,
                txn.receiverName,
                txn.receiverEmail,
                txn.description
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    renderTransactions();
}

// Render transactions table
function renderTransactions() {
    const tbody = document.getElementById('transactionsTable');
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No transactions found</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageTransactions = filteredTransactions.slice(start, end);
    
    tbody.innerHTML = pageTransactions.map((txn) => {
        const isSent = txn.type === 'sent';
        const amountClass = isSent ? 'amount-negative' : 'amount-positive';
        const amountPrefix = isSent ? '-' : '+';
        const description = isSent 
            ? `To: ${txn.receiverName || txn.receiverEmail || 'Unknown'}`
            : `From: ${txn.senderName || txn.senderEmail || 'Unknown'}`;
        
        return `
            <tr>
                <td>${formatDate(txn.createdAt)}</td>
                <td>${txn.transactionId}</td>
                <td>${description}</td>
                <td>
                    <span class="badge badge-${isSent ? 'danger' : 'success'}">
                        ${isSent ? 'Sent' : 'Received'}
                    </span>
                </td>
                <td class="${amountClass}">${amountPrefix}${formatCurrency(txn.amount)}</td>
                <td>
                    <span class="badge badge-${txn.status === 'completed' ? 'success' : txn.status === 'failed' ? 'danger' : 'warning'}">
                        ${txn.status || 'Pending'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="viewReceipt('${txn.id}')">
                        <i class="fas fa-receipt"></i> Receipt
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
    document.getElementById('pagination').style.display = totalPages > 1 ? 'flex' : 'none';
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTransactions();
    }
}

// View receipt
function viewReceipt(transactionId) {
    const txn = allTransactions.find((t) => t.id === transactionId);
    if (!txn) return;
    
    const isSent = txn.type === 'sent';
    
    document.getElementById('receiptAmount').textContent = formatCurrency(txn.amount);
    document.getElementById('receiptAmount').className = 'amount ' + (isSent ? 'amount-negative' : 'amount-positive');
    document.getElementById('receiptId').textContent = txn.receiptId || 'N/A';
    document.getElementById('receiptTxnId').textContent = txn.transactionId;
    document.getElementById('receiptDate').textContent = formatDate(txn.createdAt);
    document.getElementById('receiptSender').textContent = `${txn.senderName} (${txn.senderEmail})`;
    document.getElementById('receiptReceiver').textContent = `${txn.receiverName} (${txn.receiverEmail})`;
    document.getElementById('receiptDescription').textContent = txn.description || 'Transfer';
    
    // Update status
    const statusDiv = document.getElementById('receiptStatus');
    if (txn.status === 'failed') {
        statusDiv.innerHTML = '<i class="fas fa-times-circle"></i><span>Failed</span>';
        statusDiv.parentElement.classList.add('failed');
    } else {
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i><span>Successful</span>';
        statusDiv.parentElement.classList.remove('failed');
    }
    
    document.getElementById('receiptModal').classList.add('active');
}

// Close receipt
function closeReceipt() {
    document.getElementById('receiptModal').classList.remove('active');
}

// Print receipt
function printReceipt() {
    window.print();
}

// Export transactions
function exportTransactions() {
    if (filteredTransactions.length === 0) {
        alert('No transactions to export');
        return;
    }
    
    const csvContent = [
        ['Date', 'Transaction ID', 'Type', 'Description', 'Amount', 'Status'].join(','),
        ...filteredTransactions.map((txn) => [
            txn.createdAt ? txn.createdAt.toDate().toISOString() : 'N/A',
            txn.transactionId,
            txn.type,
            txn.description || 'Transfer',
            txn.amount,
            txn.status
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Show loading
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}
