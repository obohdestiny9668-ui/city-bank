// Transfer JavaScript

let currentUser = null;
let userData = null;
let verifiedRecipient = null;

// Exchange rates (simplified - in production, use an API)
const exchangeRates = {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    NGN: 460
};

// Check authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        loadRecentRecipients();
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
            document.getElementById('availableBalance').textContent = formatCurrency(userData.balance || 0);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Verify recipient
async function verifyRecipient() {
    const email = document.getElementById('recipientEmail').value.trim();
    const infoDiv = document.getElementById('recipientInfo');
    
    if (!email) {
        showAlert('transferAlert', 'Please enter recipient email', 'warning');
        return;
    }
    
    if (email === currentUser.email) {
        showAlert('transferAlert', 'You cannot send money to yourself', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const snapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        showLoading(false);
        
        if (snapshot.empty) {
            verifiedRecipient = null;
            infoDiv.innerHTML = `
                <div class="recipient-avatar"><i class="fas fa-times"></i></div>
                <div class="recipient-details">
                    <h4>User Not Found</h4>
                    <p>No account found with this email</p>
                </div>
            `;
            infoDiv.classList.add('error');
            infoDiv.classList.remove('hidden');
            showAlert('transferAlert', 'Recipient not found. Please check the email address.', 'danger');
        } else {
            const recipientDoc = snapshot.docs[0];
            verifiedRecipient = { id: recipientDoc.id, ...recipientDoc.data() };
            
            infoDiv.innerHTML = `
                <div class="recipient-avatar">${verifiedRecipient.firstName[0]}${verifiedRecipient.lastName[0]}</div>
                <div class="recipient-details">
                    <h4>${verifiedRecipient.firstName} ${verifiedRecipient.lastName}</h4>
                    <p>${verifiedRecipient.email}</p>
                </div>
            `;
            infoDiv.classList.remove('error', 'hidden');
            showAlert('transferAlert', 'Recipient verified successfully!', 'success');
        }
    } catch (error) {
        showLoading(false);
        console.error('Error verifying recipient:', error);
        showAlert('transferAlert', 'Error verifying recipient. Please try again.', 'danger');
    }
}

// Load recent recipients
async function loadRecentRecipients() {
    try {
        const snapshot = await db.collection('transactions')
            .where('senderId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        const recipients = new Map();
        
        snapshot.forEach((doc) => {
            const txn = doc.data();
            if (!recipients.has(txn.receiverId)) {
                recipients.set(txn.receiverId, {
                    id: txn.receiverId,
                    name: txn.receiverName,
                    email: txn.receiverEmail
                });
            }
        });
        
        const container = document.getElementById('recentRecipients');
        
        if (recipients.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No recent recipients</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = Array.from(recipients.values()).slice(0, 5).map((recipient) => `
            <div class="recipient-item" onclick="selectRecipient('${recipient.email}')">
                <div class="recipient-item-avatar">
                    ${recipient.name ? recipient.name.split(' ').map(n => n[0]).join('') : '?'}
                </div>
                <div class="recipient-item-info">
                    <h4>${recipient.name || 'Unknown'}</h4>
                    <p>${recipient.email}</p>
                </div>
                <div class="recipient-item-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent recipients:', error);
    }
}

// Select recipient from list
function selectRecipient(email) {
    document.getElementById('recipientEmail').value = email;
    verifyRecipient();
}

// Update conversion info
document.getElementById('transferAmount').addEventListener('input', updateConversion);
document.getElementById('currency').addEventListener('change', updateConversion);

function updateConversion() {
    const amount = parseFloat(document.getElementById('transferAmount').value) || 0;
    const currency = document.getElementById('currency').value;
    const infoDiv = document.getElementById('conversionInfo');
    
    if (amount > 0) {
        const usdAmount = amount / exchangeRates[currency];
        infoDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            Equivalent to approximately <strong>${formatCurrency(usdAmount)}</strong> USD
        `;
    } else {
        infoDiv.innerHTML = '';
    }
}

// Transfer form submission
document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!verifiedRecipient) {
        showAlert('transferAlert', 'Please verify the recipient first', 'warning');
        return;
    }
    
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const currency = document.getElementById('currency').value;
    const pin = document.getElementById('transferPin').value;
    const description = document.getElementById('transferDescription').value;
    
    // Validation
    if (!amount || amount <= 0) {
        showAlert('transferAlert', 'Please enter a valid amount', 'warning');
        return;
    }
    
    if (pin !== userData.transferPin) {
        showAlert('transferAlert', 'Incorrect transfer PIN', 'danger');
        return;
    }
    
    // Convert to USD for storage
    const usdAmount = amount / exchangeRates[currency];
    
    if (usdAmount > (userData.balance || 0)) {
        showAlert('transferAlert', 'Insufficient balance', 'danger');
        return;
    }
    
    showLoading(true);
    
    try {
        const transactionId = generateTransactionId();
        const receiptId = generateReceiptId();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Create transaction document
        const transactionData = {
            transactionId: transactionId,
            receiptId: receiptId,
            senderId: currentUser.uid,
            senderName: `${userData.firstName} ${userData.lastName}`,
            senderEmail: userData.email,
            receiverId: verifiedRecipient.id,
            receiverName: `${verifiedRecipient.firstName} ${verifiedRecipient.lastName}`,
            receiverEmail: verifiedRecipient.email,
            amount: usdAmount,
            originalAmount: amount,
            originalCurrency: currency,
            description: description || 'Transfer',
            status: 'completed',
            createdAt: timestamp
        };
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        
        // Update sender balance
        await db.collection('users').doc(currentUser.uid).update({
            balance: firebase.firestore.FieldValue.increment(-usdAmount)
        });
        
        // Update receiver balance
        await db.collection('users').doc(verifiedRecipient.id).update({
            balance: firebase.firestore.FieldValue.increment(usdAmount)
        });
        
        // Create notification for receiver
        await db.collection('notifications').add({
            userId: verifiedRecipient.id,
            title: 'Money Received!',
            message: `You received ${formatCurrency(usdAmount)} from ${userData.firstName} ${userData.lastName}`,
            type: 'transfer',
            read: false,
            createdAt: timestamp
        });
        
        // Reload user data
        await loadUserData();
        
        showLoading(false);
        
        // Show receipt
        showReceipt(transactionData);
        
        // Reset form
        document.getElementById('transferForm').reset();
        document.getElementById('recipientInfo').classList.add('hidden');
        document.getElementById('conversionInfo').innerHTML = '';
        verifiedRecipient = null;
        
    } catch (error) {
        showLoading(false);
        console.error('Error processing transfer:', error);
        showAlert('transferAlert', 'Transfer failed. Please try again.', 'danger');
    }
});

// Show receipt
function showReceipt(transactionData) {
    document.getElementById('receiptAmount').textContent = formatCurrency(transactionData.amount);
    document.getElementById('receiptId').textContent = transactionData.receiptId;
    document.getElementById('receiptTxnId').textContent = transactionData.transactionId;
    document.getElementById('receiptDate').textContent = new Date().toLocaleString();
    document.getElementById('receiptSender').textContent = `${transactionData.senderName} (${transactionData.senderEmail})`;
    document.getElementById('receiptReceiver').textContent = `${transactionData.receiverName} (${transactionData.receiverEmail})`;
    document.getElementById('receiptDescription').textContent = transactionData.description || 'Transfer';
    
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

// Show alert
function showAlert(elementId, message, type = 'danger') {
    const alertDiv = document.getElementById(elementId);
    alertDiv.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
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
