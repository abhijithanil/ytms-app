package com.insp17.ytms.controller;

import com.insp17.ytms.dto.*;
import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.ChatMessage;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.repositories.ChatMessageRepository;
import com.insp17.ytms.repositories.ChatRoomMemberRepository;
import com.insp17.ytms.repositories.ChatRoomRepository;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.services.ChatService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
// Add these imports to your ChatController.java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/chat")
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserService userService;

    @Autowired
    private ChatRoomMemberRepository chatRoomMemberRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    private final Map<String, Long> processedMessages = new ConcurrentHashMap<>();
    private final long MESSAGE_DEDUP_WINDOW_MS = 5000; // 5 seconds

    // Helper method to extract UserPrincipal from Principal
    private UserPrincipal getUserPrincipalFromPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken) {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            if (auth.getPrincipal() instanceof UserPrincipal) {
                return (UserPrincipal) auth.getPrincipal();
            }
        }
        return null;
    }

    @GetMapping("/status")

    public String getChatStatus() {
        return "Chat service is running";
    }

    //  CHAT ROOMS MANAGEMENT (REST ENDPOINTS)

    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomDTO> createChatRoom(@RequestBody CreateChatRoomRequest request, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                log.warn("Unauthorized create room attempt");
                return ResponseEntity.status(401).build();
            }

            log.info("Creating chat room: {} by user: {}", request.getRoomName(), userPrincipal.getUsername());
            ChatRoomDTO room = chatService.createChatRoom(request, userPrincipal.getId());
            return ResponseEntity.ok(room);
        } catch (IllegalArgumentException e) {
            log.error("Invalid request for creating chat room: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error creating chat room: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/rooms")
    public ResponseEntity<ChatRoomListResponse> getChatRooms(Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Fetching chat rooms for user: {}", userPrincipal.getUsername());
            ChatRoomListResponse rooms = chatService.getChatRoomList(userPrincipal.getId());
            return ResponseEntity.ok(rooms);
        } catch (Exception e) {
            log.error("Error fetching chat rooms: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<ChatRoomDTO> getChatRoom(@PathVariable Long roomId, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Fetching chat room {} for user: {}", roomId, userPrincipal.getUsername());
            ChatRoomDTO room = chatService.getChatRoomById(roomId, userPrincipal.getId());
            return ResponseEntity.ok(room);
        } catch (SecurityException e) {
            log.warn("Access denied to room {} for user: {}", roomId, principal.getName());
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error fetching chat room {}: {}", roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/rooms/{roomId}")
    public ResponseEntity<ChatRoomDTO> updateChatRoom(@PathVariable Long roomId,
                                                      @RequestBody UpdateChatRoomRequest request,
                                                      Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.info("Updating chat room {} by user: {}", roomId, userPrincipal.getUsername());
            ChatRoomDTO room = chatService.updateChatRoom(roomId, request, userPrincipal.getId());
            return ResponseEntity.ok(room);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error updating chat room {}: {}", roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/rooms/{roomId}/members")
    public ResponseEntity<Void> addMembersToRoom(@PathVariable Long roomId,
                                                 @RequestBody AddMembersRequest request,
                                                 Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.info("Adding {} members to room {} by user: {}",
                    request.getUserIds().size(), roomId, userPrincipal.getUsername());

            chatService.addMembersToRoom(roomId, request.getUserIds(),
                    request.getDefaultRole(), userPrincipal.getId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error adding members to room {}: {}", roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/rooms/{roomId}/members/{userId}")
    public ResponseEntity<Void> removeMemberFromRoom(@PathVariable Long roomId,
                                                     @PathVariable Long userId,
                                                     Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.info("Removing member {} from room {} by user: {}",
                    userId, roomId, userPrincipal.getUsername());
            chatService.removeMemberFromRoom(roomId, userId, userPrincipal.getId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error removing member {} from room {}: {}", userId, roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    //  DIRECT MESSAGES

    @PostMapping("/direct-messages")
    public ResponseEntity<ChatRoomDTO> createOrGetDirectMessage(@RequestParam Long recipientId, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.info("Creating/getting direct message between {} and {}",
                    userPrincipal.getUsername(), recipientId);
            ChatRoomDTO dmRoom = chatService.getOrCreateDirectMessage(userPrincipal.getId(), recipientId);
            return ResponseEntity.ok(dmRoom);
        } catch (Exception e) {
            log.error("Error creating/getting direct message with user {}: {}", recipientId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/direct-messages/send")
    public ResponseEntity<ChatMessageDTO> sendDirectMessage(@RequestBody DirectMessageRequest request, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Sending direct message from {} to {}", userPrincipal.getUsername(), request.getRecipientId());
            ChatMessageDTO message = chatService.sendDirectMessage(request, userPrincipal.getId());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Error sending direct message: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    //  MESSAGES

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getRoomMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Fetching messages for room {} (page: {}, size: {}) by user: {}",
                    roomId, page, size, userPrincipal.getUsername());
            List<ChatMessageDTO> messages = chatService.getRoomMessages(roomId, page, size, userPrincipal.getId());
            return ResponseEntity.ok(messages);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error fetching messages for room {}: {}", roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<Void> markRoomAsRead(@PathVariable Long roomId, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Marking room {} as read by user: {}", roomId, userPrincipal.getUsername());
            chatService.markRoomAsRead(roomId, userPrincipal.getId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error marking room {} as read: {}", roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/search")
    public ResponseEntity<List<ChatMessageDTO>> searchMessages(@RequestBody MessageSearchRequest request, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Searching messages with query: '{}' by user: {}", request.getQuery(), userPrincipal.getUsername());
            List<ChatMessageDTO> messages = chatService.searchMessages(request, userPrincipal.getId());
            return ResponseEntity.ok(messages);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error searching messages: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    //  BACKWARD COMPATIBILITY REST ENDPOINTS

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessageDTO>> getChatHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) Long taskId) {
        try {
            log.debug("Fetching chat history (page: {}, size: {}, taskId: {})", page, size, taskId);
            List<ChatMessageDTO> messages = chatService.getChatHistory(taskId, page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching chat history: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/online-users")
    public ResponseEntity<List<OnlineUserDTO>> getOnlineUsers() {
        try {
            List<OnlineUserDTO> users = chatService.getOnlineUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error fetching online users: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    //  WEBSOCKET MESSAGE HANDLERS

    @MessageMapping("/chat/join")
    public void joinChat(Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                User userById = userService.getUserByIdPrivateUse(userPrincipal.getId());
                String sessionId = headerAccessor.getSessionId();

                chatService.addOnlineUser(sessionId, userById);
                log.info("User {} joined chat with session {}", userPrincipal.getUsername(), sessionId);
            } else {
                log.warn("Join chat attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling chat join: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat/direct/{recipientId}")
    public void sendDirectMessageWS(@DestinationVariable Long recipientId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                String content = (String) payload.get("content");
                String attachmentUrl = (String) payload.get("attachmentUrl");
                String attachmentName = (String) payload.get("attachmentName");
                String attachmentType = (String) payload.get("attachmentType");

                if (content != null && !content.trim().isEmpty()) {
                    DirectMessageRequest request = new DirectMessageRequest();
                    request.setRecipientId(recipientId);
                    request.setContent(content.trim());
                    request.setAttachmentUrl(attachmentUrl);
                    request.setAttachmentName(attachmentName);
                    request.setAttachmentType(attachmentType);

                    chatService.sendDirectMessage(request, userPrincipal.getId());
                    log.debug("Direct message sent by user: {} to user: {}", userPrincipal.getUsername(), recipientId);
                }
            } else {
                log.warn("Direct message send attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling direct message to user {}: {}", recipientId, e.getMessage(), e);
        }
    }

    //  TYPING INDICATORS

    @MessageMapping("/typing/room/{roomId}")
    public void handleRoomTyping(@DestinationVariable Long roomId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                Boolean isTyping = (Boolean) payload.get("isTyping");
                if (isTyping != null) {
                    TypingIndicatorDTO typingIndicator = new TypingIndicatorDTO();
                    typingIndicator.setUserId(userPrincipal.getId());
                    typingIndicator.setUsername(userPrincipal.getUsername());
                    typingIndicator.setTyping(isTyping);
                    typingIndicator.setChatRoomId(roomId);

                    chatService.broadcastRoomTypingIndicator(roomId, typingIndicator);
                }
            } else {
                log.warn("Room typing attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling room typing indicator for room {}: {}", roomId, e.getMessage(), e);
        }
    }

    //  ROOM MANAGEMENT VIA WEBSOCKET

    @MessageMapping("/rooms/join/{roomId}")
    public void joinRoom(@DestinationVariable Long roomId, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                // Mark room as read when joining
                chatService.markRoomAsRead(roomId, userPrincipal.getId());
                log.debug("User {} joined room {}", userPrincipal.getUsername(), roomId);
            }
        } catch (Exception e) {
            log.error("Error handling room join for room {}: {}", roomId, e.getMessage(), e);
        }
    }

    @MessageMapping("/rooms/leave/{roomId}")
    public void leaveRoom(@DestinationVariable Long roomId, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                log.debug("User {} left room {}", userPrincipal.getUsername(), roomId);
            }
        } catch (Exception e) {
            log.error("Error handling room leave for room {}: {}", roomId, e.getMessage(), e);
        }
    }

    //  BACKWARD COMPATIBILITY WEBSOCKET HANDLERS


    @MessageMapping("/typing/global")
    public void handleGlobalTyping(Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                Boolean isTyping = (Boolean) payload.get("isTyping");
                if (isTyping != null) {
                    TypingIndicatorDTO typingIndicator = new TypingIndicatorDTO();
                    typingIndicator.setUserId(userPrincipal.getId());
                    typingIndicator.setUsername(userPrincipal.getUsername());
                    typingIndicator.setTyping(isTyping);
                    typingIndicator.setTaskId(null);

                    chatService.broadcastTypingIndicator(typingIndicator);
                }
            } else {
                log.warn("Global typing attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling global typing indicator: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/typing/task/{taskId}")
    public void handleTaskTyping(@DestinationVariable Long taskId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                Boolean isTyping = (Boolean) payload.get("isTyping");
                if (isTyping != null) {
                    TypingIndicatorDTO typingIndicator = new TypingIndicatorDTO();
                    typingIndicator.setUserId(userPrincipal.getId());
                    typingIndicator.setUsername(userPrincipal.getUsername());
                    typingIndicator.setTyping(isTyping);
                    typingIndicator.setTaskId(taskId);

                    chatService.broadcastTypingIndicator(typingIndicator);
                }
            } else {
                log.warn("Task typing attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling task typing indicator for task {}: {}", taskId, e.getMessage(), e);
        }
    }

    @MessageMapping("/users/status")
    public void updateUserStatus(Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                String status = (String) payload.get("status");
                if (status != null) {
                    chatService.updateUserStatus(userPrincipal.getId(), status);
                    log.debug("User {} updated status to: {}", userPrincipal.getUsername(), status);
                }
            } else {
                log.warn("Status update attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling status update: {}", e.getMessage(), e);
        }
    }


    // Add this method to your ChatController class
    private boolean isDuplicateMessage(String messageId, String content) {
        if (messageId == null) {
            // Generate a simple hash for messages without ID
            messageId = content.hashCode() + "_" + System.currentTimeMillis();
        }

        long currentTime = System.currentTimeMillis();

        // Clean old entries
        processedMessages.entrySet().removeIf(entry ->
                currentTime - entry.getValue() > MESSAGE_DEDUP_WINDOW_MS);

        // Check if message was recently processed
        if (processedMessages.containsKey(messageId)) {
            log.debug("Duplicate message detected: {}", messageId);
            return true;
        }

        // Mark message as processed
        processedMessages.put(messageId, currentTime);
        return false;
    }

    // Update your sendRoomMessage method
    @MessageMapping("/chat/room/{roomId}")
    public void sendRoomMessage(@DestinationVariable Long roomId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                String content = (String) payload.get("content");
                String messageId = (String) payload.get("messageId");

                // Check for duplicate messages
                if (isDuplicateMessage(messageId, content)) {
                    log.debug("Ignoring duplicate message from user: {} to room: {}", userPrincipal.getUsername(), roomId);
                    return;
                }

                String attachmentUrl = (String) payload.get("attachmentUrl");
                String attachmentName = (String) payload.get("attachmentName");
                String attachmentType = (String) payload.get("attachmentType");
                Long parentMessageId = payload.get("parentMessageId") != null ?
                        Long.valueOf(payload.get("parentMessageId").toString()) : null;

                if (content != null && !content.trim().isEmpty()) {
                    SendMessageRequest request = new SendMessageRequest();
                    request.setChatRoomId(roomId);
                    request.setContent(content.trim());
                    request.setAttachmentUrl(attachmentUrl);
                    request.setAttachmentName(attachmentName);
                    request.setAttachmentType(attachmentType);
                    request.setParentMessageId(parentMessageId);

                    chatService.sendMessageToRoom(request, userPrincipal.getId());
                    log.debug("Room message sent by user: {} to room: {}", userPrincipal.getUsername(), roomId);
                }
            } else {
                log.warn("Room message send attempt without valid authentication - principal: {}", principal);
            }
        } catch (SecurityException e) {
            log.warn("Access denied for room message to room {}: {}", roomId, e.getMessage());
        } catch (Exception e) {
            log.error("Error handling room message to room {}: {}", roomId, e.getMessage(), e);
        }
    }

    // Update your sendGlobalMessage method
    @MessageMapping("/chat/global")
    public void sendGlobalMessage(Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                User userById = userService.getUserByIdPrivateUse(userPrincipal.getId());
                String content = (String) payload.get("content");
                String messageId = (String) payload.get("messageId");

                // Check for duplicate messages
                if (isDuplicateMessage(messageId, content)) {
                    log.debug("Ignoring duplicate global message from user: {}", userPrincipal.getUsername());
                    return;
                }

                if (content != null && !content.trim().isEmpty()) {
                    chatService.sendMessage(content.trim(), userById, null);
                    log.debug("Global message sent by user: {}", userPrincipal.getUsername());
                }
            } else {
                log.warn("Message send attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling global message: {}", e.getMessage(), e);
        }
    }

    // Update your sendTaskMessage method similarly
    @MessageMapping("/chat/task/{taskId}")
    public void sendTaskMessage(@DestinationVariable Long taskId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                User userById = userService.getUserByIdPrivateUse(userPrincipal.getId());
                String content = (String) payload.get("content");
                String messageId = (String) payload.get("messageId");

                // Check for duplicate messages
                if (isDuplicateMessage(messageId, content + "_task_" + taskId)) {
                    log.debug("Ignoring duplicate task message from user: {} for task: {}", userPrincipal.getUsername(), taskId);
                    return;
                }

                if (content != null && !content.trim().isEmpty()) {
                    chatService.sendMessage(content.trim(), userById, taskId);
                    log.debug("Task message sent by user: {} for task: {}", userPrincipal.getUsername(), taskId);
                }
            } else {
                log.warn("Task message send attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling task message for task {}: {}", taskId, e.getMessage(), e);
        }
    }


    // Enhanced search endpoint with filters
    @PostMapping("/search/advanced")
    public ResponseEntity<MessageSearchResponse> advancedSearchMessages(
            @RequestBody MessageSearchRequest request,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            log.debug("Advanced search with query: '{}' by user: {}", request.getQuery(), userPrincipal.getUsername());

            // Enhanced search with metadata
            MessageSearchResponse response = chatService.advancedSearchMessages(request, userPrincipal.getId());
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error in advanced search: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // Search within specific date range
    @GetMapping("/rooms/{roomId}/messages/date-range")
    public ResponseEntity<List<ChatMessageDTO>> getMessagesByDateRange(
            @PathVariable Long roomId,
            @RequestParam String fromDate,
            @RequestParam String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            // Verify user has access to room
            if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userPrincipal.getId())) {
                return ResponseEntity.status(403).build();
            }

            LocalDateTime from = LocalDateTime.parse(fromDate);
            LocalDateTime to = LocalDateTime.parse(toDate);

            PageRequest pageRequest = PageRequest.of(page, size);
            List<ChatMessage> messages = chatMessageRepository.findByChatRoomIdAndCreatedAtBetween(
                    roomId, from, to, pageRequest);

            List<ChatMessageDTO> messageDTOs = messages.stream()
                    .map(ChatMessageDTO::new)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(messageDTOs);
        } catch (Exception e) {
            log.error("Error fetching messages by date range for room {}: {}", roomId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // Get message context (messages around a specific message)
    @GetMapping("/messages/{messageId}/context")
    public ResponseEntity<MessageContextResponse> getMessageContext(
            @PathVariable Long messageId,
            @RequestParam(defaultValue = "10") int beforeCount,
            @RequestParam(defaultValue = "10") int afterCount,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            MessageContextResponse context = chatService.getMessageContext(messageId, beforeCount, afterCount, userPrincipal.getId());
            return ResponseEntity.ok(context);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error getting message context for message {}: {}", messageId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // MESSAGE REACTIONS

    @PostMapping("/messages/{messageId}/reactions")
    public ResponseEntity<Void> addReaction(@PathVariable Long messageId, 
                                          @RequestBody AddReactionRequest request, 
                                          Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            chatService.toggleMessageReaction(messageId, request.getEmoji(), userPrincipal.getId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        } catch (Exception e) {
            log.error("Error adding reaction to message {}: {}", messageId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @MessageMapping("/reactions/add")
    public void addReactionViaWebSocket(AddReactionRequest request, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                chatService.toggleMessageReaction(request.getMessageId(), request.getEmoji(), userPrincipal.getId());
                log.debug("Reaction {} added to message {} by user: {}", 
                         request.getEmoji(), request.getMessageId(), userPrincipal.getUsername());
            }
        } catch (Exception e) {
            log.error("Error handling reaction via WebSocket: {}", e.getMessage(), e);
        }
    }
}