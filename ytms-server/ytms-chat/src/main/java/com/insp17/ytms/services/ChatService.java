package com.insp17.ytms.services;


import com.insp17.ytms.dto.*;
import com.insp17.ytms.dto.ChatMessageDTO;
import com.insp17.ytms.dtos.OnlineUserDTO;
import com.insp17.ytms.dto.TypingIndicatorDTO;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.entity.OnlineUser;
import com.insp17.ytms.repositories.ChatMessageRepository;
import com.insp17.ytms.repositories.ChatRoomMemberRepository;
import com.insp17.ytms.repositories.ChatRoomRepository;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Transactional
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private ChatRoomMemberRepository chatRoomMemberRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserService userService;

    @Autowired
    private VideoTaskService videoTaskService;

    // In-memory storage for online users
    private final Map<String, OnlineUser> onlineUsers = new ConcurrentHashMap<>();
    private final Map<Long, String> userSessions = new ConcurrentHashMap<>();

    // === CHAT ROOMS MANAGEMENT ===

    public ChatRoomDTO createChatRoom(CreateChatRoomRequest request, Long creatorId) {
        User creator = userService.getUserByIdPrivateUse(creatorId);

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setRoomName(request.getRoomName());
        chatRoom.setRoomDescription(request.getRoomDescription());
        chatRoom.setRoomType(request.getRoomType());
        chatRoom.setIsPrivate(request.getIsPrivate());
        chatRoom.setCreatedBy(creatorId);
        chatRoom.setTaskId(request.getTaskId());

        // For direct messages, set participant ID and generate room name
        if (request.getRoomType() == ChatRoom.RoomType.DIRECT_MESSAGE) {
            if (request.getDmParticipantId() == null) {
                throw new IllegalArgumentException("DM participant ID is required for direct messages");
            }

            // Check if DM already exists
            Optional<ChatRoom> existingDM = chatRoomRepository.findDirectMessageRoom(creatorId, request.getDmParticipantId());
            if (existingDM.isPresent()) {
                return new ChatRoomDTO(existingDM.get());
            }

            User participant = userService.getUserByIdPrivateUse(request.getDmParticipantId());
            chatRoom.setDmParticipantId(request.getDmParticipantId());
            chatRoom.setRoomName(ChatRoom.generateDMRoomName(creator.getUsername(), participant.getUsername()));
            chatRoom.setIsPrivate(true);
        }

        chatRoom = chatRoomRepository.save(chatRoom);

        // Add creator as owner
        addMemberToRoom(chatRoom.getId(), creatorId, ChatRoomMember.MemberRole.OWNER);

        // Add other members for group chats or DM participant
        if (request.getRoomType() == ChatRoom.RoomType.DIRECT_MESSAGE) {
            addMemberToRoom(chatRoom.getId(), request.getDmParticipantId(), ChatRoomMember.MemberRole.MEMBER);
        } else if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            for (Long memberId : request.getMemberIds()) {
                if (!memberId.equals(creatorId)) {
                    addMemberToRoom(chatRoom.getId(), memberId, ChatRoomMember.MemberRole.MEMBER);
                }
            }
        }

        ChatRoomDTO roomDTO = getChatRoomById(chatRoom.getId(), creatorId);

        // Broadcast room creation to relevant users
        broadcastRoomUpdate(roomDTO, "created");

        return roomDTO;
    }

    public ChatRoomDTO getOrCreateDirectMessage(Long userId1, Long userId2) {
        Optional<ChatRoom> existingRoom = chatRoomRepository.findDirectMessageRoom(userId1, userId2);

        if (existingRoom.isPresent()) {
            return getChatRoomById(existingRoom.get().getId(), userId1);
        }

        CreateChatRoomRequest request = new CreateChatRoomRequest();
        request.setRoomType(ChatRoom.RoomType.DIRECT_MESSAGE);
        request.setDmParticipantId(userId2);

        return createChatRoom(request, userId1);
    }

    public List<ChatRoomDTO> getUserChatRooms(Long userId) {
        List<ChatRoom> rooms = chatRoomRepository.findUserChatRooms(userId);
        return rooms.stream()
                .map(room -> buildChatRoomDTO(room, userId))
                .collect(Collectors.toList());
    }

    public ChatRoomListResponse getChatRoomList(Long userId) {
        List<ChatRoom> allRooms = chatRoomRepository.findUserChatRooms(userId);

        ChatRoomListResponse response = new ChatRoomListResponse();

        // Separate rooms by type
        for (ChatRoom room : allRooms) {
            ChatRoomDTO roomDTO = buildChatRoomDTO(room, userId);

            switch (room.getRoomType()) {
                case DIRECT_MESSAGE:
                    response.getDirectMessages().add(roomDTO);
                    break;
                case GROUP_CHAT:
                    response.getGroupChats().add(roomDTO);
                    break;
                case TASK_CHAT:
                    response.getTaskChats().add(roomDTO);
                    break;
                case GLOBAL_CHAT:
                    response.setGlobalChat(roomDTO);
                    break;
            }
        }

        // Calculate total unread count
        response.setTotalUnreadCount(chatRoomRepository.countUnreadRooms(userId));

        return response;
    }

    public ChatRoomDTO getChatRoomById(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Verify user has access to this room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            throw new SecurityException("User does not have access to this chat room");
        }

        return buildChatRoomDTO(room, userId);
    }

    private ChatRoomDTO buildChatRoomDTO(ChatRoom room, Long userId) {
        ChatRoomDTO dto = new ChatRoomDTO(room);

        // Get user's membership info
        Optional<ChatRoomMember> userMembership = chatRoomMemberRepository.findByChatRoomIdAndUserId(room.getId(), userId);
        if (userMembership.isPresent()) {
            ChatRoomMember member = userMembership.get();
            dto.setUserRole(member.getRole());
            dto.setIsMuted(member.getIsMuted());
            dto.setNotificationsEnabled(member.getNotificationsEnabled());
            dto.setLastReadAt(member.getLastReadAt());
        }

        // Get unread count
        dto.setUnreadCount(chatMessageRepository.countUnreadMessages(room.getId(), userId));

        // Get latest message
        Optional<ChatMessage> latestMessage = chatMessageRepository.findLatestMessageInRoom(room.getId(), PageRequest.of(0, 1));
        if (latestMessage.isPresent()) {
            dto.setLastMessage(new ChatMessageDTO(latestMessage.get()));
        }

        // For DMs, get participant info
        if (room.isDirectMessage() && room.getDmParticipantId() != null) {
            User participant = userService.getUserByIdPrivateUse(room.getDmParticipantId());
            dto.setDmParticipantName(participant.getFirstName() != null ? participant.getFirstName() : participant.getUsername());
            dto.setDmParticipantUsername(participant.getUsername());
            dto.setDmParticipantStatus(isUserOnline(participant.getId()) ? "online" : "offline");
        }

        // Get members for group chats
        if (room.isGroupChat()) {
            List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoomIdOrderByJoinedAtAsc(room.getId());
            dto.setMembers(members.stream()
                    .map(member -> {
                        ChatRoomMemberDTO memberDTO = new ChatRoomMemberDTO(member);
                        memberDTO.setStatus(isUserOnline(member.getUserId()) ? "online" : "offline");
                        return memberDTO;
                    })
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    // === MESSAGING ===

    public ChatMessageDTO sendMessageToRoom(SendMessageRequest request, Long senderId) {
        ChatRoom room = chatRoomRepository.findById(request.getChatRoomId())
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Verify user is member of the room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(room.getId(), senderId)) {
            throw new SecurityException("User is not a member of this chat room");
        }

        User sender = userService.getUserByIdPrivateUse(senderId);

        ChatMessage message = new ChatMessage();
        message.setContent(request.getContent());
        message.setSenderId(senderId);
        message.setSenderUsername(sender.getUsername());
        message.setSenderName(sender.getFirstName() != null ? sender.getFirstName() : sender.getUsername());
        message.setType(request.getType());
        message.setChatRoom(room);
        message.setParentMessageId(request.getParentMessageId());
        message.setAttachmentUrl(request.getAttachmentUrl());
        message.setAttachmentName(request.getAttachmentName());
        message.setAttachmentType(request.getAttachmentType());

        // Handle thread replies
        if (request.getParentMessageId() != null) {
            message.setType(ChatMessage.MessageType.THREAD_REPLY);
            // Update parent message thread count
            ChatMessage parentMessage = chatMessageRepository.findById(request.getParentMessageId())
                    .orElseThrow(() -> new RuntimeException("Parent message not found"));
            parentMessage.setThreadReplyCount(parentMessage.getThreadReplyCount() + 1);
            chatMessageRepository.save(parentMessage);
        }

        message = chatMessageRepository.save(message);

        // Update room's last message time
        room.setLastMessageAt(LocalDateTime.now());
        chatRoomRepository.save(room);

        ChatMessageDTO messageDTO = new ChatMessageDTO(message);

        // Broadcast message to room subscribers
        String destination = "/topic/chat/room/" + room.getId();
        messagingTemplate.convertAndSend(destination, messageDTO);

        // Send notifications to room members
        sendNotificationsToMembers(room, messageDTO, senderId);

        return messageDTO;
    }

    public ChatMessageDTO sendDirectMessage(DirectMessageRequest request, Long senderId) {
        ChatRoomDTO dmRoom = getOrCreateDirectMessage(senderId, request.getRecipientId());

        SendMessageRequest messageRequest = new SendMessageRequest();
        messageRequest.setChatRoomId(dmRoom.getId());
        messageRequest.setContent(request.getContent());
        messageRequest.setAttachmentUrl(request.getAttachmentUrl());
        messageRequest.setAttachmentName(request.getAttachmentName());
        messageRequest.setAttachmentType(request.getAttachmentType());

        return sendMessageToRoom(messageRequest, senderId);
    }

    // === BACKWARD COMPATIBILITY ===

    public ChatMessageDTO sendMessage(String content, User sender, Long taskId) {
        if (taskId != null) {
            // Task-specific message
            if (!videoTaskService.canUserAccessTask(taskId, sender)) {
                throw new SecurityException("User does not have access to this task");
            }

            // Get or create task chat room
            ChatRoom taskRoom = getOrCreateTaskChatRoom(taskId);

            SendMessageRequest request = new SendMessageRequest();
            request.setChatRoomId(taskRoom.getId());
            request.setContent(content);

            return sendMessageToRoom(request, sender.getId());
        } else {
            // Global chat message - keep existing logic for compatibility
            ChatMessage message = new ChatMessage();
            message.setContent(content);
            message.setSenderId(sender.getId());
            message.setSenderUsername(sender.getUsername());
            message.setSenderName(sender.getFirstName() != null ? sender.getFirstName() : sender.getUsername());
            message.setType(ChatMessage.MessageType.CHAT);
            message.setTaskId(taskId);
            message.setCreatedAt(LocalDateTime.now());

            ChatMessage savedMessage = chatMessageRepository.save(message);
            ChatMessageDTO messageDTO = new ChatMessageDTO(savedMessage);

            messagingTemplate.convertAndSend("/topic/chat/global", messageDTO);
            return messageDTO;
        }
    }

    private ChatRoom getOrCreateTaskChatRoom(Long taskId) {
        Optional<ChatRoom> existingRoom = chatRoomRepository.findByTaskIdAndRoomType(taskId, ChatRoom.RoomType.TASK_CHAT);

        if (existingRoom.isPresent()) {
            return existingRoom.get();
        }

        // Create new task chat room
        CreateChatRoomRequest request = new CreateChatRoomRequest();
        request.setRoomType(ChatRoom.RoomType.TASK_CHAT);
        request.setTaskId(taskId);
        request.setRoomName("Task Chat #" + taskId);
        request.setIsPrivate(true);

        // Add all users who have access to the task
        // This would need to be implemented based on your task permission system

        ChatRoomDTO roomDTO = createChatRoom(request, getCurrentUser().getId());
        return chatRoomRepository.findById(roomDTO.getId()).get();
    }

    // === ROOM MEMBER MANAGEMENT ===

    public void addMemberToRoom(Long roomId, Long userId, ChatRoomMember.MemberRole role) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Check if user is already a member
        if (chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            return; // User is already a member
        }

        User user = userService.getUserByIdPrivateUse(userId);

        ChatRoomMember member = new ChatRoomMember();
        member.setChatRoom(room);
        member.setUserId(userId);
        member.setUsername(user.getUsername());
        member.setDisplayName(user.getFirstName() != null ? user.getFirstName() : user.getUsername());
        member.setRole(role);

        chatRoomMemberRepository.save(member);

        // Send join message
        sendSystemMessage(room, user.getUsername() + " joined the chat", ChatMessage.MessageType.JOIN);

        // Notify room members
        broadcastMemberUpdate(roomId, new ChatRoomMemberDTO(member), "joined");
    }

    public void removeMemberFromRoom(Long roomId, Long userId, Long requesterId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Check permissions
        ChatRoomMember requesterMember = chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, requesterId)
                .orElseThrow(() -> new SecurityException("Requester is not a member of this room"));

        ChatRoomMember targetMember = chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this room"));

        // Check if requester has permission to remove members
        if (!canManageMembers(requesterMember.getRole()) && !userId.equals(requesterId)) {
            throw new SecurityException("Insufficient permissions to remove members");
        }

        User user = userService.getUserByIdPrivateUse(userId);

        chatRoomMemberRepository.deleteByChatRoomIdAndUserId(roomId, userId);

        // Send leave message
        sendSystemMessage(room, user.getUsername() + " left the chat", ChatMessage.MessageType.LEAVE);

        // Notify room members
        broadcastMemberUpdate(roomId, new ChatRoomMemberDTO(targetMember), "left");
    }

    private boolean canManageMembers(ChatRoomMember.MemberRole role) {
        return role == ChatRoomMember.MemberRole.OWNER || role == ChatRoomMember.MemberRole.ADMIN;
    }

    // === MESSAGE HISTORY ===

    public List<ChatMessageDTO> getChatHistory(Long taskId, int page, int size) {
        // Backward compatibility method
        UserPrincipal currentUser = getCurrentUser();
        if (currentUser == null) {
            return new ArrayList<>();
        }

        if (taskId != null) {
            User user = userService.getUserByIdPrivateUse(currentUser.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                throw new SecurityException("User does not have access to this task");
            }
        }

        PageRequest pageRequest = PageRequest.of(page, size);
        List<ChatMessage> messages;

        if (taskId != null) {
            messages = chatMessageRepository.findByTaskIdOrderByCreatedAtAsc(taskId, pageRequest);
        } else {
            messages = chatMessageRepository.findGlobalChatMessagesOrderByCreatedAtAsc(pageRequest);
        }

        return messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    public List<ChatMessageDTO> getRoomMessages(Long roomId, int page, int size, Long userId) {
        // Verify user has access to room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            throw new SecurityException("User does not have access to this chat room");
        }

        PageRequest pageRequest = PageRequest.of(page, size);
        List<ChatMessage> messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId, pageRequest);

        return messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    // === READ STATUS ===

    public void markRoomAsRead(Long roomId, Long userId) {
        ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this room"));

        member.setLastReadAt(LocalDateTime.now());
        chatRoomMemberRepository.save(member);

        // Broadcast read status update for DMs
        ChatRoom room = chatRoomRepository.findById(roomId).orElse(null);
        if (room != null && room.isDirectMessage()) {
            broadcastReadStatus(roomId, userId);
        }
    }

    // === SEARCH ===

    public List<ChatMessageDTO> searchMessages(MessageSearchRequest request, Long userId) {
        if (request.getChatRoomId() != null) {
            // Verify user has access to room
            if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(request.getChatRoomId(), userId)) {
                throw new SecurityException("User does not have access to this chat room");
            }
        }

        PageRequest pageRequest = PageRequest.of(request.getPage(), request.getSize());
        List<ChatMessage> messages = chatMessageRepository.searchMessagesInRoom(
                request.getChatRoomId(),
                request.getQuery(),
                pageRequest
        );

        return messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    // === UTILITIES ===

    private void sendSystemMessage(ChatRoom room, String content, ChatMessage.MessageType type) {
        ChatMessage systemMessage = new ChatMessage();
        systemMessage.setContent(content);
        systemMessage.setSenderId(0L); // System user
        systemMessage.setSenderUsername("System");
        systemMessage.setSenderName("System");
        systemMessage.setType(type);
        systemMessage.setChatRoom(room);

        chatMessageRepository.save(systemMessage);

        ChatMessageDTO messageDTO = new ChatMessageDTO(systemMessage);
        String destination = "/topic/chat/room/" + room.getId();
        messagingTemplate.convertAndSend(destination, messageDTO);
    }

    private void sendNotificationsToMembers(ChatRoom room, ChatMessageDTO message, Long senderId) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoomIdOrderByJoinedAtAsc(room.getId());

        for (ChatRoomMember member : members) {
            if (!member.getUserId().equals(senderId) && member.getNotificationsEnabled()) {
                // Send personal notification
                messagingTemplate.convertAndSendToUser(
                        member.getUserId().toString(),
                        "/queue/notifications",
                        createNotification(room, message)
                );
            }
        }
    }

    private Map<String, Object> createNotification(ChatRoom room, ChatMessageDTO message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "new_message");
        notification.put("roomId", room.getId());
        notification.put("roomName", room.getRoomName());
        notification.put("roomType", room.getRoomType());
        notification.put("senderName", message.getSenderName());
        notification.put("content", message.getContent());
        notification.put("timestamp", message.getCreatedAt());
        return notification;
    }

    private void broadcastRoomUpdate(ChatRoomDTO room, String action) {
        Map<String, Object> update = new HashMap<>();
        update.put("action", action);
        update.put("room", room);
        update.put("timestamp", LocalDateTime.now());

        messagingTemplate.convertAndSend("/topic/rooms/updates", update);
    }

    private void broadcastMemberUpdate(Long roomId, ChatRoomMemberDTO member, String action) {
        Map<String, Object> update = new HashMap<>();
        update.put("action", action);
        update.put("member", member);
        update.put("roomId", roomId);
        update.put("timestamp", LocalDateTime.now());

        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/members", update);
    }

    private void broadcastReadStatus(Long roomId, Long userId) {
        Map<String, Object> readStatus = new HashMap<>();
        readStatus.put("userId", userId);
        readStatus.put("readAt", LocalDateTime.now());

        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/read-status", readStatus);
    }

    // === EXISTING METHODS (preserved for compatibility) ===

    public List<OnlineUserDTO> getOnlineUsers() {
        return onlineUsers.values().stream()
                .map(OnlineUserDTO::new)
                .collect(Collectors.toList());
    }

    public void addOnlineUser(String sessionId, User user) {
        OnlineUser onlineUser = new OnlineUser();
        onlineUser.setUserId(user.getId());
        onlineUser.setUsername(user.getUsername());
        onlineUser.setFirstName(user.getFirstName());
        onlineUser.setLastName(user.getLastName());
        onlineUser.setEmail(user.getEmail());
        onlineUser.setSessionId(sessionId);
        onlineUser.setLastSeen(LocalDateTime.now());
        onlineUser.setStatus("online");

        removeUserSessions(user.getId());
        onlineUsers.put(sessionId, onlineUser);
        userSessions.put(user.getId(), sessionId);

        broadcastOnlineUsersUpdate();
        broadcastUserStatusChange(onlineUser, "joined");
    }

    public void removeOnlineUser(String sessionId) {
        OnlineUser user = onlineUsers.remove(sessionId);
        if (user != null) {
            userSessions.remove(user.getUserId());
            broadcastOnlineUsersUpdate();
            broadcastUserStatusChange(user, "left");
        }
    }

    public void updateUserStatus(Long userId, String status) {
        String sessionId = userSessions.get(userId);
        if (sessionId != null) {
            OnlineUser user = onlineUsers.get(sessionId);
            if (user != null) {
                user.setStatus(status);
                user.setLastSeen(LocalDateTime.now());
                broadcastOnlineUsersUpdate();
            }
        }
    }

    public void broadcastTypingIndicator(TypingIndicatorDTO typingIndicator) {
        String destination = typingIndicator.getTaskId() != null
                ? "/topic/typing/task/" + typingIndicator.getTaskId()
                : "/topic/typing/global";
        messagingTemplate.convertAndSend(destination, typingIndicator);
    }

    public boolean isUserOnline(Long userId) {
        return userSessions.containsKey(userId);
    }

    public long getMessageCount(Long taskId) {
        if (taskId != null) {
            return chatMessageRepository.countByTaskIdAndIsDeletedFalse(taskId);
        } else {
            return chatMessageRepository.countGlobalMessages();
        }
    }

    private void removeUserSessions(Long userId) {
        String existingSessionId = userSessions.get(userId);
        if (existingSessionId != null) {
            onlineUsers.remove(existingSessionId);
        }
    }

    private void broadcastOnlineUsersUpdate() {
        List<OnlineUserDTO> onlineUserList = getOnlineUsers();
        messagingTemplate.convertAndSend("/topic/users/online", onlineUserList);
    }

    private void broadcastUserStatusChange(OnlineUser user, String action) {
        Map<String, Object> statusChange = new HashMap<>();
        statusChange.put("user", new OnlineUserDTO(user));
        statusChange.put("action", action);
        statusChange.put("timestamp", LocalDateTime.now());

        messagingTemplate.convertAndSend("/topic/users/status", statusChange);
    }

    private UserPrincipal getCurrentUser() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof UserPrincipal) {
                return (UserPrincipal) principal;
            }
        } catch (Exception e) {
            // Handle case where no authentication context is available
        }
        return null;
    }
}