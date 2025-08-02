# Enhanced Chat System Integration Guide

## Overview
The YTMS platform now includes a comprehensive Slack-like chat system with advanced features for team collaboration around video editing tasks.

## Quick Start

### Backend Integration

1. **WebSocket Configuration** (Already configured)
   - Endpoint: `/ws` with SockJS fallback
   - Authentication via JWT in headers
   - Rate limiting and security in place

2. **Chat API Endpoints**
   ```
   GET  /api/chat/rooms                     - List user's chat rooms
   POST /api/chat/rooms                     - Create new chat room
   GET  /api/chat/rooms/{id}/messages       - Get room messages
   POST /api/chat/messages/{id}/reactions   - Add/remove reaction
   POST /api/chat/direct-messages           - Send direct message
   POST /api/chat/search                    - Search messages
   ```

3. **WebSocket Endpoints**
   ```
   /app/chat/join                   - Join global chat
   /app/chat/room/{roomId}          - Send room message
   /app/chat/direct/{recipientId}   - Send direct message
   /app/typing/room/{roomId}        - Typing indicators
   /app/reactions/add               - Add reaction via WS
   ```

### Frontend Integration

1. **Install Dependencies** (Already included)
   ```json
   {
     "@stomp/stompjs": "^7.1.1",
     "sockjs-client": "^1.6.1",
     "date-fns": "^2.30.0",
     "react-hot-toast": "^2.4.1",
     "lucide-react": "^0.263.1"
   }
   ```

2. **Use Enhanced Components**
   ```jsx
   import { NotificationProvider } from './context/NotificationContext';
   import EnhancedChatPanel from './components/chat/EnhancedChatPanel';
   import NotificationBell from './components/chat/NotificationBell';
   
   function App() {
     return (
       <NotificationProvider>
         <div className="app">
           <NotificationBell />
           <EnhancedChatPanel 
             room={selectedRoom}
             messages={messages}
             onSendMessage={handleSendMessage}
             onAddReaction={handleAddReaction}
           />
         </div>
       </NotificationProvider>
     );
   }
   ```

## Key Features

### 1. Emoji Reactions
- Click the + button next to any message
- Choose from categorized emojis
- Real-time updates across all users
- Backend stores reactions in JSON format

### 2. Rich Text Formatting
- **Bold text** with `**text**`
- *Italic text* with `*text*`
- `Code snippets` with backticks
- Live markdown rendering

### 3. File Attachments
- Drag & drop or click to upload
- Supports images, videos, documents
- Preview before sending
- Secure file storage integration

### 4. Real-time Notifications
- Browser notifications for mentions
- Toast alerts for new messages
- Notification bell with unread count
- Context-aware notification types

### 5. Message Encryption (Optional)
- AES encryption for sensitive messages
- Automatic encryption detection
- Secure key management
- Configurable per room/conversation

## Testing the Features

### 1. Basic Messaging
```javascript
// Send a formatted message
const message = {
  content: "Hello **team**! Check this `code` snippet.",
  chatRoomId: roomId
};
stompClient.send('/app/chat/room/' + roomId, {}, JSON.stringify(message));
```

### 2. Add Reactions
```javascript
// Add reaction via REST API
fetch('/api/chat/messages/' + messageId + '/reactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messageId, emoji: '👍' })
});

// Or via WebSocket
stompClient.send('/app/reactions/add', {}, JSON.stringify({
  messageId: messageId,
  emoji: '👍'
}));
```

### 3. Test Notifications
```javascript
// Trigger mention notification
const { notifyMention } = useNotifications();
notifyMention('John Doe', 'Check out this video edit!', 'Video Team', () => {
  // Navigate to message
});
```

### 4. File Upload Example
```javascript
const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  });
  
  const fileData = await response.json();
  return {
    url: fileData.url,
    name: file.name,
    type: file.type
  };
};
```

## Security Features

### 1. Authentication
- JWT token required for all WebSocket connections
- User authorization checked for room access
- Rate limiting on message sending

### 2. Message Encryption
```javascript
// Encrypt sensitive messages
const encryptedContent = messageEncryptionUtil.encryptMessage(plainText);

// Messages automatically decrypted on retrieval
const plainText = messageEncryptionUtil.decryptMessage(encryptedContent);
```

### 3. Input Validation
- XSS protection in markdown rendering
- File type and size validation
- Content length limits

## Performance Optimizations

### 1. Message Pagination
- Default 50 messages per page
- Infinite scroll support
- Optimized database queries

### 2. Real-time Efficiency
- WebSocket connection pooling
- Message deduplication
- Typing indicator debouncing

### 3. Caching
- User presence caching
- Message reactions caching
- File metadata caching

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Mobile Responsiveness
- Touch-friendly emoji picker
- Responsive chat layout
- Mobile notification support
- Optimized for tablets and phones

## Demo Page
See `ChatIntegrationExample.js` for a complete working example with:
- Mock data
- All features demonstrated
- Integration patterns
- Best practices

## Troubleshooting

### Common Issues
1. **WebSocket connection fails**: Check JWT token and CORS configuration
2. **Reactions not updating**: Verify room membership and permissions
3. **File uploads failing**: Check file size limits and storage configuration
4. **Notifications not showing**: Ensure browser permissions granted

### Debug Tools
```javascript
// Enable WebSocket debugging
stompClient.debug = (str) => console.log('STOMP: ' + str);

// Check notification permissions
console.log('Notification permission:', Notification.permission);

// Verify room membership
console.log('User rooms:', await fetch('/api/chat/rooms').then(r => r.json()));
```