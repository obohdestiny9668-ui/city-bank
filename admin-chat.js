// Admin Chat JavaScript

let currentUser = null;
let userData = null;
let allChats = [];
let currentChatId = null;
let currentChatData = null;
let unsubscribeMessages = null;

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
            loadChats();
            
            // Check for user filter in URL
            const urlParams = new URLSearchParams(window.location.search);
            const userFilter = urlParams.get('user');
            if (userFilter) {
                openChatWithUser(userFilter);
            }
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'index.html';
    }
}

// Load all chats
async function loadChats() {
    showLoading(true);
    
    try {
        // Subscribe to chats
        db.collection('chats')
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot((snapshot) => {
                allChats = [];
                snapshot.forEach((doc) => {
                    allChats.push({ id: doc.id, ...doc.data() });
                });
                renderChatList();
            }, (error) => {
                console.error('Error loading chats:', error);
            });
        
        showLoading(false);
        
    } catch (error) {
        showLoading(false);
        console.error('Error loading chats:', error);
    }
}

// Render chat list
function renderChatList() {
    const container = document.getElementById('chatList');
    
    if (allChats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No active chats</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allChats.map((chat) => {
        const initials = chat.userName ? chat.userName.split(' ').map(n => n[0]).join('') : '?';
        const lastMessage = chat.lastMessage || 'No messages yet';
        const unreadClass = chat.unreadCount > 0 ? 'unread' : '';
        const activeClass = chat.id === currentChatId ? 'active' : '';
        
        return `
            <div class="chat-item ${unreadClass} ${activeClass}" onclick="selectChat('${chat.id}')">
                <div class="chat-avatar">${initials}</div>
                <div class="chat-info">
                    <h4>${chat.userName || 'Unknown User'}</h4>
                    <p>${lastMessage.substring(0, 30)}${lastMessage.length > 30 ? '...' : ''}</p>
                </div>
                <div class="chat-meta">
                    <span class="chat-time">${chat.lastMessageTime ? formatTime(chat.lastMessageTime) : ''}</span>
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Select chat
async function selectChat(chatId) {
    currentChatId = chatId;
    currentChatData = allChats.find((c) => c.id === chatId);
    
    if (!currentChatData) return;
    
    // Update UI
    document.getElementById('noChatSelected').classList.add('hidden');
    document.getElementById('activeChat').classList.remove('hidden');
    
    // Update chat header
    const initials = currentChatData.userName ? currentChatData.userName.split(' ').map(n => n[0]).join('') : '?';
    document.getElementById('chatUserAvatar').textContent = initials;
    document.getElementById('chatUserName').textContent = currentChatData.userName || 'Unknown User';
    document.getElementById('chatUserEmail').textContent = currentChatData.userEmail || '';
    document.getElementById('viewUserProfile').href = `admin-users.html?user=${currentChatData.userId}`;
    
    // Render chat list to update active state
    renderChatList();
    
    // Load messages
    loadMessages();
    
    // Reset unread count
    try {
        await db.collection('chats').doc(chatId).update({
            unreadCount: 0
        });
    } catch (error) {
        console.error('Error resetting unread count:', error);
    }
}

// Open chat with specific user
async function openChatWithUser(userId) {
    // Find chat with this user
    const chat = allChats.find((c) => c.userId === userId);
    
    if (chat) {
        selectChat(chat.id);
    } else {
        // Create new chat
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                const chatRef = await db.collection('chats').add({
                    userId: userId,
                    userName: `${userData.firstName} ${userData.lastName}`,
                    userEmail: userData.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessage: null,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    unreadCount: 0,
                    status: 'active'
                });
                
                // Wait for the chat to appear in the list
                setTimeout(() => {
                    selectChat(chatRef.id);
                }, 500);
            }
        } catch (error) {
            console.error('Error creating chat:', error);
        }
    }
}

// Load messages
function loadMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    // Add welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message system-message';
    welcomeDiv.innerHTML = `
        <div class="message-content">
            <p>Chat started with ${currentChatData.userName || 'User'}</p>
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        </div>
    `;
    messagesContainer.appendChild(welcomeDiv);
    
    unsubscribeMessages = db.collection('chats')
        .doc(currentChatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    displayMessage(message);
                }
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, (error) => {
            console.error('Error loading messages:', error);
        });
}

// Display message
function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const isAdmin = message.senderId === currentUser.uid;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isAdmin ? 'sent' : 'received'}`;
    
    let content = '';
    if (message.imageUrl) {
        content = `<img src="${message.imageUrl}" class="message-image" alt="Shared image">`;
    }
    if (message.text) {
        content += `<p>${escapeHtml(message.text)}</p>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${content}
            <span class="message-time">${formatTime(message.timestamp)}</span>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentChatId) return;
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    input.value = '';
    
    try {
        // Add message
        await db.collection('chats')
            .doc(currentChatId)
            .collection('messages')
            .add({
                senderId: currentUser.uid,
                senderName: 'City Bank Support',
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        
        // Update chat
        await db.collection('chats').doc(currentChatId).update({
            lastMessage: text,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
    }
});

// Handle file upload
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChatId) return;
    
    showLoading(true);
    
    try {
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;
            
            // Add message with image
            await db.collection('chats')
                .doc(currentChatId)
                .collection('messages')
                .add({
                    senderId: currentUser.uid,
                    senderName: 'City Bank Support',
                    imageUrl: base64Image,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
            
            // Update chat
            await db.collection('chats').doc(currentChatId).update({
                lastMessage: '📷 Image',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showLoading(false);
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        showLoading(false);
        console.error('Error uploading image:', error);
    }
});

// Format time
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show loading
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}
