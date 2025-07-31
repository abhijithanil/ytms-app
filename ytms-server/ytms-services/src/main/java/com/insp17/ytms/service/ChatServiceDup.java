//package com.insp17.ytms.service;
//
//import com.insp17.ytms.dtos.ChatMessageDTO;
//import com.insp17.ytms.dtos.OnlineUserDTO;
//import com.insp17.ytms.dto.TypingIndicatorDTO;
//import com.insp17.ytms.dtos.UserPrincipal;
//import com.insp17.ytms.entity.ChatMessage;
//import com.insp17.ytms.entity.OnlineUser;
//import com.insp17.ytms.entity.User;
//import com.insp17.ytms.repository.ChatMessageRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.data.domain.PageRequest;
//import org.springframework.messaging.simp.SimpMessagingTemplate;
//import org.springframework.security.core.context.SecurityContextHolder;
//import org.springframework.stereotype.Service;
//
//import java.time.LocalDateTime;
//import java.util.*;
//import java.util.concurrent.ConcurrentHashMap;
//import java.util.stream.Collectors;
//
//@Service
//public class ChatServiceDup {
//
//    @Autowired
//    private ChatMessageRepository chatMessageRepository;
//
//    @Autowired
//    private SimpMessagingTemplate messagingTemplate;
//
//    @Autowired
//    private UserService userService;
//
//    @Autowired
//    private VideoTaskService videoTaskService;
//
//    // In-memory storage for online users (consider Redis for production)
//    private final Map<String, OnlineUser> onlineUsers = new ConcurrentHashMap<>();
//    private final Map<Long, String> userSessions = new ConcurrentHashMap<>();
//
//    public ChatMessageDTO sendMessage(String content, User sender, Long taskId) {
//        // Verify user has access to task if taskId is provided
//        if (taskId != null && !videoTaskService.canUserAccessTask(taskId, sender)) {
//            throw new SecurityException("User does not have access to this task");
//        }
//
//        ChatMessage message = new ChatMessage();
//        message.setContent(content);
//        message.setSenderId(sender.getId());
//        message.setSenderUsername(sender.getUsername());
//
//        String senderName = "";
//        if (sender.getFirstName() != null && sender.getLastName() != null) {
//            senderName = sender.getFirstName();
//        } else {
//            senderName = sender.getUsername();
//        }
//        message.setSenderName(senderName);
//
//        message.setType(ChatMessage.MessageType.CHAT);
//        message.setTaskId(taskId);
//        message.setCreatedAt(LocalDateTime.now());
//
//        ChatMessage savedMessage = chatMessageRepository.save(message);
//        ChatMessageDTO messageDTO = new ChatMessageDTO(savedMessage);
//
//        // Broadcast to appropriate channel
//        String destination = taskId != null ? "/topic/chat/task/" + taskId : "/topic/chat/global";
//        messagingTemplate.convertAndSend(destination, messageDTO);
//
//        return messageDTO;
//    }
//
//    public List<ChatMessageDTO> getChatHistory(Long taskId, int page, int size) {
//        // Get current user from security context
//        UserPrincipal currentUser = getCurrentUser();
//        if (currentUser == null) {
//            return new ArrayList<>();
//        }
//
//        // Verify access to task if taskId is provided
//        if (taskId != null) {
//            User user = userService.getUserByIdPrivateUse(currentUser.getId());
//            if (!videoTaskService.canUserAccessTask(taskId, user)) {
//                throw new SecurityException("User does not have access to this task");
//            }
//        }
//
//        PageRequest pageRequest = PageRequest.of(page, size);
//        List<ChatMessage> messages;
//
//        if (taskId != null) {
//            // Use the new ascending order method
//            messages = chatMessageRepository.findByTaskIdOrderByCreatedAtAsc(taskId, pageRequest);
//        } else {
//            // Use the new ascending order method for global messages
//            messages = chatMessageRepository.findGlobalChatMessagesOrderByCreatedAtAsc(pageRequest);
//        }
//
//        // Convert to DTOs - no need to reverse since they're already in chronological order
//        return messages.stream()
//                .map(ChatMessageDTO::new)
//                .collect(Collectors.toList());
//    }
//
//    public void addOnlineUser(String sessionId, User user) {
//        OnlineUser onlineUser = new OnlineUser();
//        onlineUser.setUserId(user.getId());
//        onlineUser.setUsername(user.getUsername());
//        onlineUser.setFirstName(user.getFirstName());
//        onlineUser.setLastName(user.getLastName());
//        onlineUser.setEmail(user.getEmail());
//        onlineUser.setSessionId(sessionId);
//        onlineUser.setLastSeen(LocalDateTime.now());
//        onlineUser.setStatus("online");
//
//        // Remove any existing session for this user
//        removeUserSessions(user.getId());
//
//        onlineUsers.put(sessionId, onlineUser);
//        userSessions.put(user.getId(), sessionId);
//
//        // Broadcast user joined
//        broadcastOnlineUsersUpdate();
//        broadcastUserStatusChange(onlineUser, "joined");
//    }
//
//    public void removeOnlineUser(String sessionId) {
//        OnlineUser user = onlineUsers.remove(sessionId);
//        if (user != null) {
//            userSessions.remove(user.getUserId());
//            broadcastOnlineUsersUpdate();
//            broadcastUserStatusChange(user, "left");
//        }
//    }
//
//    public void updateUserStatus(Long userId, String status) {
//        String sessionId = userSessions.get(userId);
//        if (sessionId != null) {
//            OnlineUser user = onlineUsers.get(sessionId);
//            if (user != null) {
//                user.setStatus(status);
//                user.setLastSeen(LocalDateTime.now());
//                broadcastOnlineUsersUpdate();
//            }
//        }
//    }
//
//    public List<OnlineUserDTO> getOnlineUsers() {
//        return onlineUsers.values().stream()
//                .map(OnlineUserDTO::new)
//                .collect(Collectors.toList());
//    }
//
//    public void broadcastTypingIndicator(TypingIndicatorDTO typingIndicator) {
//        String destination = typingIndicator.getTaskId() != null
//                ? "/topic/typing/task/" + typingIndicator.getTaskId()
//                : "/topic/typing/global";
//        messagingTemplate.convertAndSend(destination, typingIndicator);
//    }
//
//    public boolean isUserOnline(Long userId) {
//        return userSessions.containsKey(userId);
//    }
//
//    public long getMessageCount(Long taskId) {
//        if (taskId != null) {
//            return chatMessageRepository.countByTaskId(taskId);
//        } else {
//            return chatMessageRepository.countGlobalMessages();
//        }
//    }
//
//    private void removeUserSessions(Long userId) {
//        String existingSessionId = userSessions.get(userId);
//        if (existingSessionId != null) {
//            onlineUsers.remove(existingSessionId);
//        }
//    }
//
//    private void broadcastOnlineUsersUpdate() {
//        List<OnlineUserDTO> onlineUserList = getOnlineUsers();
//        messagingTemplate.convertAndSend("/topic/users/online", onlineUserList);
//    }
//
//    private void broadcastUserStatusChange(OnlineUser user, String action) {
//        Map<String, Object> statusChange = new HashMap<>();
//        statusChange.put("user", new OnlineUserDTO(user));
//        statusChange.put("action", action);
//        statusChange.put("timestamp", LocalDateTime.now());
//
//        messagingTemplate.convertAndSend("/topic/users/status", statusChange);
//    }
//
//    private UserPrincipal getCurrentUser() {
//        try {
//            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
//            if (principal instanceof UserPrincipal) {
//                return (UserPrincipal) principal;
//            }
//        } catch (Exception e) {
//            // Handle case where no authentication context is available
//        }
//        return null;
//    }
//}
