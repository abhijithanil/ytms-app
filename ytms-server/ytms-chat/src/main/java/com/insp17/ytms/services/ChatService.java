package com.insp17.ytms.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insp17.ytms.dto.*;
import com.insp17.ytms.dtos.OnlineUserDTO;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repositories.ChatMessageRepository;
import com.insp17.ytms.repositories.ChatRoomMemberRepository;
import com.insp17.ytms.repositories.ChatRoomRepository;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
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

    @Autowired
    private ObjectMapper objectMapper;

    // In-memory storage for online users
    @Autowired
    private Map<String, OnlineUser> onlineUsers;
    private final Map<Long, String> userSessions = new ConcurrentHashMap<>();

    //  CHAT ROOMS MANAGEMENT

    public ChatRoomDTO createChatRoom(CreateChatRoomRequest request, Long creatorId) {
        log.info("Creating chat room: {} by user: {}", request.getRoomName(), creatorId);

        User creator = userService.getUserByIdPrivateUse(creatorId);
        if (creator == null) {
            throw new IllegalArgumentException("Creator user not found");
        }

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setRoomName(request.getRoomName());
        chatRoom.setRoomDescription(request.getRoomDescription());
        chatRoom.setRoomType(request.getRoomType());
        chatRoom.setIsPrivate(request.getIsPrivate() != null ? request.getIsPrivate() : false);
        chatRoom.setCreatedBy(creatorId);
        chatRoom.setTaskId(request.getTaskId());
        chatRoom.setCreatedAt(LocalDateTime.now());

        // For direct messages, set participant ID and generate room name
        if (request.getRoomType() == ChatRoom.RoomType.DIRECT_MESSAGE) {
            if (request.getDmParticipantId() == null) {
                throw new IllegalArgumentException("DM participant ID is required for direct messages");
            }

            // Check if DM already exists
            Optional<ChatRoom> existingDM = chatRoomRepository.findDirectMessageRoom(creatorId, request.getDmParticipantId());
            if (existingDM.isPresent()) {
                log.info("Direct message room already exists between users {} and {}", creatorId, request.getDmParticipantId());
                return buildChatRoomDTO(existingDM.get(), creatorId);
            }

            User participant = userService.getUserByIdPrivateUse(request.getDmParticipantId());
            if (participant == null) {
                throw new IllegalArgumentException("DM participant user not found");
            }

            chatRoom.setDmParticipantId(request.getDmParticipantId());
            chatRoom.setRoomName(ChatRoom.generateDMRoomName(creator.getUsername(), participant.getUsername()));
            chatRoom.setIsPrivate(true);
        }

        chatRoom = chatRoomRepository.save(chatRoom);
        log.info("Created chat room with ID: {}", chatRoom.getId());

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

        ChatRoomDTO roomDTO = buildChatRoomDTO(chatRoom, creatorId);

        // Broadcast room creation to relevant users
        broadcastRoomUpdate(roomDTO, "created");

        return roomDTO;
    }

    public ChatRoomDTO updateChatRoom(Long roomId, UpdateChatRoomRequest request, Long userId) {
        log.info("Updating chat room {} by user: {}", roomId, userId);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Check if user has permission to update room
        ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new SecurityException("User is not a member of this room"));

        if (!canEditRoom(member.getRole())) {
            throw new SecurityException("Insufficient permissions to edit room");
        }

        // Update room details
        if (request.getRoomName() != null) {
            room.setRoomName(request.getRoomName());
        }
        if (request.getRoomDescription() != null) {
            room.setRoomDescription(request.getRoomDescription());
        }
        if (request.getIsPrivate() != null) {
            room.setIsPrivate(request.getIsPrivate());
        }
        if (request.getIsArchived() != null) {
            room.setIsArchived(request.getIsArchived());
        }

        room.setUpdatedAt(LocalDateTime.now());
        room = chatRoomRepository.save(room);

        ChatRoomDTO roomDTO = buildChatRoomDTO(room, userId);
        broadcastRoomUpdate(roomDTO, "updated");

        return roomDTO;
    }

    public ChatRoomDTO getOrCreateDirectMessage(Long userId1, Long userId2) {
        log.debug("Getting or creating direct message between users {} and {}", userId1, userId2);

        Optional<ChatRoom> existingRoom = chatRoomRepository.findDirectMessageRoom(userId1, userId2);

        if (existingRoom.isPresent()) {
            return buildChatRoomDTO(existingRoom.get(), userId1);
        }

        CreateChatRoomRequest request = new CreateChatRoomRequest();
        request.setRoomType(ChatRoom.RoomType.DIRECT_MESSAGE);
        request.setDmParticipantId(userId2);

        return createChatRoom(request, userId1);
    }

    public List<ChatRoomDTO> getUserChatRooms(Long userId) {
        log.debug("Fetching chat rooms for user: {}", userId);

        List<ChatRoom> rooms = chatRoomRepository.findUserChatRooms(userId);
        return rooms.stream()
                .map(room -> buildChatRoomDTO(room, userId))
                .collect(Collectors.toList());
    }

    public ChatRoomListResponse getChatRoomList(Long userId) {
        log.debug("Building chat room list for user: {}", userId);

        List<ChatRoom> allRooms = chatRoomRepository.findUserChatRooms(userId);

        ChatRoomListResponse response = new ChatRoomListResponse();
        List<ChatRoomDTO> directMessages = new ArrayList<>();
        List<ChatRoomDTO> groupChats = new ArrayList<>();
        List<ChatRoomDTO> taskChats = new ArrayList<>();
        ChatRoomDTO globalChat = null;

        for (ChatRoom room : allRooms) {
            ChatRoomDTO roomDTO = buildChatRoomDTO(room, userId);

            switch (room.getRoomType()) {
                case DIRECT_MESSAGE:
                    directMessages.add(roomDTO);
                    break;
                case GROUP_CHAT:
                    groupChats.add(roomDTO);
                    break;
                case TASK_CHAT:
                    taskChats.add(roomDTO);
                    break;
                case GLOBAL_CHAT:
                    globalChat = roomDTO;
                    break;
            }
        }

        response.setDirectMessages(directMessages);
        response.setGroupChats(groupChats);
        response.setTaskChats(taskChats);
        response.setGlobalChat(globalChat);

        // Calculate total unread count
        long totalUnread = directMessages.stream().mapToLong(r -> r.getUnreadCount() != null ? r.getUnreadCount() : 0).sum() +
                groupChats.stream().mapToLong(r -> r.getUnreadCount() != null ? r.getUnreadCount() : 0).sum() +
                taskChats.stream().mapToLong(r -> r.getUnreadCount() != null ? r.getUnreadCount() : 0).sum() +
                (globalChat != null && globalChat.getUnreadCount() != null ? globalChat.getUnreadCount() : 0);

        response.setTotalUnreadCount(totalUnread);

        return response;
    }

    public ChatRoomDTO getChatRoomById(Long roomId, Long userId) {
        log.debug("Fetching chat room {} for user: {}", roomId, userId);

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
            dto.setUserJoinedAt(member.getJoinedAt());
        }

        // Get unread count
        long unreadCount = chatMessageRepository.countUnreadMessages(room.getId(), userId);
        dto.setUnreadCount(unreadCount);

        // Get latest message
        Optional<ChatMessage> latestMessage = chatMessageRepository.findTopByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(room.getId());
        if (latestMessage.isPresent()) {
            dto.setLastMessage(new ChatMessageDTO(latestMessage.get()));
            dto.setLastMessageAt(latestMessage.get().getCreatedAt());
        }

        // For DMs, get participant info
        if (room.isDirectMessage() && room.getDmParticipantId() != null) {
            // Determine which user is the "other" participant
            Long participantId = room.getDmParticipantId().equals(userId) ? room.getCreatedBy() : room.getDmParticipantId();

            try {
                User participant = userService.getUserByIdPrivateUse(participantId);
                if (participant != null) {
                    dto.setDmParticipantId(participant.getId());
                    dto.setDmParticipantName(participant.getFirstName() != null ? participant.getFirstName() : participant.getUsername());
                    dto.setDmParticipantUsername(participant.getUsername());
                    dto.setDmParticipantEmail(participant.getEmail());
                    dto.setDmParticipantStatus(isUserOnline(participant.getId()) ? "online" : "offline");
                }
            } catch (Exception e) {
                log.warn("Failed to load DM participant info for user {}: {}", participantId, e.getMessage());
            }
        }

        // Get members for group chats
        if (room.isGroupChat() || room.getRoomType() == ChatRoom.RoomType.TASK_CHAT) {
            List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoomIdOrderByJoinedAtAsc(room.getId());
            List<ChatRoomMemberDTO> memberDTOs = members.stream()
                    .map(member -> {
                        ChatRoomMemberDTO memberDTO = new ChatRoomMemberDTO(member);
                        memberDTO.setStatus(isUserOnline(member.getUserId()) ? "online" : "offline");
                        memberDTO.setIsOnline(isUserOnline(member.getUserId()));
                        return memberDTO;
                    })
                    .collect(Collectors.toList());
            dto.setMembers(memberDTOs);
            dto.setMemberCount((long) members.size());
        }

        // Get message count
        long messageCount = chatMessageRepository.countByChatRoomIdAndIsDeletedFalse(room.getId());
        dto.setMessageCount(messageCount);

        return dto;
    }

    //  MESSAGING

    public ChatMessageDTO sendMessageToRoom(SendMessageRequest request, Long senderId) {
        log.debug("Sending message to room {} by user: {}", request.getChatRoomId(), senderId);

        ChatRoom room = chatRoomRepository.findById(request.getChatRoomId())
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Verify user is member of the room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(room.getId(), senderId)) {
            throw new SecurityException("User is not a member of this chat room");
        }

        User sender = userService.getUserByIdPrivateUse(senderId);
        if (sender == null) {
            throw new RuntimeException("Sender user not found");
        }

        ChatMessage message = new ChatMessage();
        message.setContent(request.getContent());
        message.setSenderId(senderId);
        message.setSenderUsername(sender.getUsername());
        message.setSenderName(sender.getFirstName() != null ? sender.getFirstName() : sender.getUsername());
        message.setType(request.getType() != null ? request.getType() : ChatMessage.MessageType.CHAT);
        message.setChatRoom(room);
        message.setParentMessageId(request.getParentMessageId());
        message.setAttachmentUrl(request.getAttachmentUrl());
        message.setAttachmentName(request.getAttachmentName());
        message.setAttachmentType(request.getAttachmentType());
        message.setCreatedAt(LocalDateTime.now());

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
        log.debug("Broadcasted message to {}", destination);

        // Send notifications to room members
        sendNotificationsToMembers(room, messageDTO, senderId);

        return messageDTO;
    }

    public ChatMessageDTO sendDirectMessage(DirectMessageRequest request, Long senderId) {
        log.debug("Sending direct message from {} to {}", senderId, request.getRecipientId());

        ChatRoomDTO dmRoom = getOrCreateDirectMessage(senderId, request.getRecipientId());

        SendMessageRequest messageRequest = new SendMessageRequest();
        messageRequest.setChatRoomId(dmRoom.getId());
        messageRequest.setContent(request.getContent());
        messageRequest.setAttachmentUrl(request.getAttachmentUrl());
        messageRequest.setAttachmentName(request.getAttachmentName());
        messageRequest.setAttachmentType(request.getAttachmentType());

        return sendMessageToRoom(messageRequest, senderId);
    }

    //  MEMBER MANAGEMENT

    public void addMembersToRoom(Long roomId, List<Long> userIds, ChatRoomMember.MemberRole defaultRole, Long requesterId) {
        log.info("Adding {} members to room {} by user: {}", userIds.size(), roomId, requesterId);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Check permissions
        ChatRoomMember requesterMember = chatRoomMemberRepository.findByChatRoomIdAndUserId(roomId, requesterId)
                .orElseThrow(() -> new SecurityException("Requester is not a member of this room"));

        if (!canManageMembers(requesterMember.getRole())) {
            throw new SecurityException("Insufficient permissions to add members");
        }

        for (Long userId : userIds) {
            addMemberToRoom(roomId, userId, defaultRole != null ? defaultRole : ChatRoomMember.MemberRole.MEMBER);
        }
    }

    public void addMemberToRoom(Long roomId, Long userId, ChatRoomMember.MemberRole role) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Check if user is already a member
        if (chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            log.debug("User {} is already a member of room {}", userId, roomId);
            return; // User is already a member
        }

        User user = userService.getUserByIdPrivateUse(userId);
        if (user == null) {
            log.warn("User {} not found when adding to room {}", userId, roomId);
            return;
        }

        ChatRoomMember member = new ChatRoomMember();
        member.setChatRoom(room);
        member.setUserId(userId);
        member.setUsername(user.getUsername());
        member.setDisplayName(user.getFirstName() != null ? user.getFirstName() : user.getUsername());
        member.setRole(role != null ? role : ChatRoomMember.MemberRole.MEMBER);
        member.setJoinedAt(LocalDateTime.now());

        chatRoomMemberRepository.save(member);

        // Send join message (except for DMs)
        if (room.getRoomType() != ChatRoom.RoomType.DIRECT_MESSAGE) {
            sendSystemMessage(room, user.getUsername() + " joined the chat", ChatMessage.MessageType.JOIN);
        }

        // Notify room members
        broadcastMemberUpdate(roomId, new ChatRoomMemberDTO(member), "joined");
        log.debug("Added user {} to room {} with role {}", userId, roomId, role);
    }

    public void removeMemberFromRoom(Long roomId, Long userId, Long requesterId) {
        log.info("Removing member {} from room {} by user: {}", userId, roomId, requesterId);

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

        // Prevent removing room owner unless they're removing themselves
        if (targetMember.getRole() == ChatRoomMember.MemberRole.OWNER && !userId.equals(requesterId)) {
            throw new SecurityException("Cannot remove room owner");
        }

        User user = userService.getUserByIdPrivateUse(userId);

        chatRoomMemberRepository.deleteByChatRoomIdAndUserId(roomId, userId);

        // Send leave message (except for DMs)
        if (room.getRoomType() != ChatRoom.RoomType.DIRECT_MESSAGE && user != null) {
            String leaveMessage = userId.equals(requesterId) ?
                    user.getUsername() + " left the chat" :
                    user.getUsername() + " was removed from the chat";
            sendSystemMessage(room, leaveMessage, ChatMessage.MessageType.LEAVE);
        }

        // Notify room members
        broadcastMemberUpdate(roomId, new ChatRoomMemberDTO(targetMember), "left");
    }

    private boolean canManageMembers(ChatRoomMember.MemberRole role) {
        return role == ChatRoomMember.MemberRole.OWNER || role == ChatRoomMember.MemberRole.ADMIN;
    }

    private boolean canEditRoom(ChatRoomMember.MemberRole role) {
        return role == ChatRoomMember.MemberRole.OWNER || role == ChatRoomMember.MemberRole.ADMIN;
    }

    //  MESSAGE HISTORY

    public List<ChatMessageDTO> getChatHistory(Long taskId, int page, int size) {
        log.debug("Fetching chat history for taskId: {}, page: {}, size: {}", taskId, page, size);

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
        return getRoomMessages(roomId, page, size, userId, false);
    }

    public List<ChatMessageDTO> getRoomMessages(Long roomId, int page, int size, Long userId, boolean mainOnly) {
        log.debug("Fetching messages for room {} by user: {} (mainOnly: {})", roomId, userId, mainOnly);

        // Verify user has access to room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            throw new SecurityException("User does not have access to this chat room");
        }

        PageRequest pageRequest = PageRequest.of(page, size);
        List<ChatMessage> messages;

        if (mainOnly) {
            // Only fetch main messages (no replies) - useful for thread view
            messages = chatMessageRepository.findMainMessagesByChatRoomIdOrderByCreatedAtAsc(roomId, pageRequest);
        } else {
            // Fetch all messages including replies - default behavior
            messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId, pageRequest);
        }

        log.debug("Retrieved {} messages for room {} (mainOnly: {})", messages.size(), roomId, mainOnly);

        return messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    //  READ STATUS

    public void markRoomAsRead(Long roomId, Long userId) {
        log.debug("Marking room {} as read by user: {}", roomId, userId);

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

    //  SEARCH

    public List<ChatMessageDTO> searchMessages(MessageSearchRequest request, Long userId) {
        log.debug("Searching messages with query: '{}' by user: {}", request.getQuery(), userId);

        if (request.getChatRoomId() != null) {
            // Verify user has access to room
            if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(request.getChatRoomId(), userId)) {
                throw new SecurityException("User does not have access to this chat room");
            }
        }

        PageRequest pageRequest = PageRequest.of(request.getPage(), request.getSize());
        List<ChatMessage> messages;

        if (request.getChatRoomId() != null) {
            messages = chatMessageRepository.searchMessagesInRoom(
                    request.getChatRoomId(),
                    request.getQuery(),
                    pageRequest
            );
        } else {
            // Search across all rooms user has access to
            List<ChatRoom> userRooms = chatRoomRepository.findUserChatRooms(userId);
            messages = new ArrayList<>();
            for (ChatRoom room : userRooms) {
                List<ChatMessage> roomMessages = chatMessageRepository.searchMessagesInRoom(
                        room.getId(),
                        request.getQuery(),
                        PageRequest.of(0, request.getSize())
                );
                messages.addAll(roomMessages);
            }

            // Sort by creation date and limit results
            messages = messages.stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(request.getSize())
                    .collect(Collectors.toList());
        }

        return messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    //  TYPING INDICATORS

    public void broadcastRoomTypingIndicator(Long roomId, TypingIndicatorDTO typingIndicator) {
        String destination = "/topic/typing/room/" + roomId;
        messagingTemplate.convertAndSend(destination, typingIndicator);
        log.debug("Broadcasted typing indicator to {}", destination);
    }

    //  MESSAGE REACTIONS

    // AddReactionToMessage with better error handling and broadcast
    public void addReactionToMessage(Long messageId, String reactionType, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has access to the message's room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)) {
            throw new SecurityException("User does not have access to this message");
        }

        try {
            Map<String, Object> reactions = parseReactions(message.getReactions());
            Map<String, Object> reactionData = (Map<String, Object>) reactions.computeIfAbsent(reactionType, k -> {
                Map<String, Object> newReaction = new HashMap<>();
                newReaction.put("count", 0);
                newReaction.put("userIds", new ArrayList<>());
                return newReaction;
            });

            List<Long> userIds = (List<Long>) reactionData.get("userIds");
            if (!userIds.contains(userId)) {
                userIds.add(userId);
                reactionData.put("count", userIds.size());

                String reactionsJson = objectMapper.writeValueAsString(reactions);
                message.setReactions(reactionsJson);
                chatMessageRepository.save(message);

                log.info("Added reaction {} to message {} by user {}", reactionType, messageId, userId);

                // Broadcast reaction update
                broadcastReactionUpdate(message.getChatRoom().getId(), messageId, reactionType, userId, "added");
            } else {
                log.debug("User {} already has reaction {} on message {}", userId, reactionType, messageId);
            }
        } catch (Exception e) {
            log.error("Failed to add reaction: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to add reaction");
        }
    }

    // RemoveReactionFromMessage with better error handling and return value
    public boolean removeReactionFromMessage(Long messageId, String reactionType, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has access to the message's room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)) {
            throw new SecurityException("User does not have access to this message");
        }

        try {
            Map<String, Object> reactions = parseReactions(message.getReactions());
            Map<String, Object> reactionData = (Map<String, Object>) reactions.get(reactionType);

            if (reactionData != null) {
                List<Long> userIds = (List<Long>) reactionData.get("userIds");
                boolean wasRemoved = userIds.remove(userId);

                if (wasRemoved) {
                    if (userIds.isEmpty()) {
                        // Remove the entire reaction type if no users left
                        reactions.remove(reactionType);
                        log.debug("Removed reaction type {} entirely from message {}", reactionType, messageId);
                    } else {
                        // Update count
                        reactionData.put("count", userIds.size());
                        log.debug("Updated reaction {} count to {} on message {}", reactionType, userIds.size(), messageId);
                    }

                    String reactionsJson = objectMapper.writeValueAsString(reactions);
                    message.setReactions(reactionsJson);
                    chatMessageRepository.save(message);

                    log.info("Removed reaction {} from message {} by user {}", reactionType, messageId, userId);

                    // Broadcast reaction update
                    broadcastReactionUpdate(message.getChatRoom().getId(), messageId, reactionType, userId, "removed");

                    return true; // Successfully removed
                } else {
                    log.debug("User {} did not have reaction {} on message {}", userId, reactionType, messageId);
                    return false; // User didn't have this reaction
                }
            } else {
                log.debug("Reaction type {} not found on message {}", reactionType, messageId);
                return false; // Reaction type doesn't exist
            }
        } catch (Exception e) {
            log.error("Failed to remove reaction: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to remove reaction");
        }
    }

    // Toggle reaction method for better UX
    public boolean toggleReactionOnMessage(Long messageId, String reactionType, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has access to the message's room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)) {
            throw new SecurityException("User does not have access to this message");
        }

        try {
            Map<String, Object> reactions = parseReactions(message.getReactions());
            Map<String, Object> reactionData = (Map<String, Object>) reactions.get(reactionType);

            boolean userHasReaction = false;
            if (reactionData != null) {
                List<Long> userIds = (List<Long>) reactionData.get("userIds");
                userHasReaction = userIds.contains(userId);
            }

            if (userHasReaction) {
                // Remove reaction
                removeReactionFromMessage(messageId, reactionType, userId);
                return false; // Removed
            } else {
                // Add reaction
                addReactionToMessage(messageId, reactionType, userId);
                return true; // Added
            }
        } catch (Exception e) {
            log.error("Failed to toggle reaction: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to toggle reaction");
        }
    }

    // ParseReactions with better error handling
    private Map<String, Object> parseReactions(String reactionsJson) {
        try {
            if (reactionsJson == null || reactionsJson.trim().isEmpty() || "{}".equals(reactionsJson)) {
                return new HashMap<>();
            }

            Map<String, Object> reactions = objectMapper.readValue(reactionsJson, Map.class);

            // Ensure all reaction data has the correct structure
            for (Map.Entry<String, Object> entry : reactions.entrySet()) {
                Map<String, Object> reactionData = (Map<String, Object>) entry.getValue();
                if (!reactionData.containsKey("userIds")) {
                    reactionData.put("userIds", new ArrayList<>());
                }
                if (!reactionData.containsKey("count")) {
                    reactionData.put("count", ((List<?>) reactionData.get("userIds")).size());
                }
            }

            return reactions;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse reactions JSON: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    //  Broadcast method with more details
    private void broadcastReactionUpdate(Long roomId, Long messageId, String reactionType, Long userId, String action) {
        Map<String, Object> reactionUpdate = new HashMap<>();
        reactionUpdate.put("messageId", messageId);
        reactionUpdate.put("reactionType", reactionType);
        reactionUpdate.put("userId", userId);
        reactionUpdate.put("action", action);
        reactionUpdate.put("timestamp", LocalDateTime.now());
        reactionUpdate.put("roomId", roomId);

        // Broadcast to room subscribers
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/reactions", reactionUpdate);

        log.debug("Broadcasted reaction update: {} {} on message {} in room {}",
                action, reactionType, messageId, roomId);
    }

    public Map<String, MessageReactionDTO> getMessageReactions(Long messageId, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has access to the message's room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)) {
            throw new SecurityException("User does not have access to this message");
        }

        try {
            Map<String, Object> reactions = parseReactions(message.getReactions());
            Map<String, MessageReactionDTO> result = new HashMap<>();

            for (Map.Entry<String, Object> entry : reactions.entrySet()) {
                Map<String, Object> reactionData = (Map<String, Object>) entry.getValue();
                List<Long> userIds = (List<Long>) reactionData.get("userIds");

                MessageReactionDTO dto = new MessageReactionDTO();
                dto.setReactionType(entry.getKey());
                dto.setCount((Integer) reactionData.get("count"));
                dto.setUserIds(userIds);
                dto.setCurrentUserReacted(userIds.contains(userId));

                result.put(entry.getKey(), dto);
            }

            return result;
        } catch (Exception e) {
            log.error("Failed to get reactions: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    //  MESSAGE ACTIONS

    public ChatMessageDTO editMessage(Long messageId, String newContent, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user is the sender or has admin permissions
        if (!message.getSenderId().equals(userId)) {
            ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)
                    .orElseThrow(() -> new SecurityException("User is not a member of this room"));

            if (!canManageMembers(member.getRole())) {
                throw new SecurityException("Cannot edit this message");
            }
        }

        message.setContent(newContent);
        message.setIsEdited(true);
        message.setUpdatedAt(LocalDateTime.now());
        message = chatMessageRepository.save(message);

        ChatMessageDTO messageDTO = new ChatMessageDTO(message);

        // Broadcast message update
        broadcastMessageUpdate(message.getChatRoom().getId(), messageDTO, "edited");

        return messageDTO;
    }

    public void deleteMessage(Long messageId, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user is the sender or has admin permissions
        if (!message.getSenderId().equals(userId)) {
            ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)
                    .orElseThrow(() -> new SecurityException("User is not a member of this room"));

            if (!canManageMembers(member.getRole())) {
                throw new SecurityException("Cannot delete this message");
            }
        }

        message.setIsDeleted(true);
        message.setUpdatedAt(LocalDateTime.now());
        chatMessageRepository.save(message);

        // Broadcast message deletion
        broadcastMessageUpdate(message.getChatRoom().getId(), new ChatMessageDTO(message), "deleted");
    }

    public void pinMessage(Long messageId, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has admin permissions
        ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)
                .orElseThrow(() -> new SecurityException("User is not a member of this room"));

        if (!canManageMembers(member.getRole())) {
            throw new SecurityException("Cannot pin messages");
        }

        // Broadcast pin action
        broadcastMessageUpdate(message.getChatRoom().getId(), new ChatMessageDTO(message), "pinned");
    }

    public void unpinMessage(Long messageId, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has admin permissions
        ChatRoomMember member = chatRoomMemberRepository.findByChatRoomIdAndUserId(message.getChatRoom().getId(), userId)
                .orElseThrow(() -> new SecurityException("User is not a member of this room"));

        if (!canManageMembers(member.getRole())) {
            throw new SecurityException("Cannot unpin messages");
        }

        // Broadcast unpin action
        broadcastMessageUpdate(message.getChatRoom().getId(), new ChatMessageDTO(message), "unpinned");
    }

    //  THREAD SUPPORT

    public List<ChatMessageDTO> getThreadReplies(Long messageId, int page, int size, Long userId) {
        ChatMessage parentMessage = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has access to the message's room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(parentMessage.getChatRoom().getId(), userId)) {
            throw new SecurityException("User does not have access to this message");
        }

        PageRequest pageRequest = PageRequest.of(page, size);
        List<ChatMessage> replies = chatMessageRepository.findThreadReplies(messageId, pageRequest);

        return replies.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    public ChatMessageDTO sendReply(SendReplyRequest request, Long userId) {
        ChatMessage parentMessage = chatMessageRepository.findById(request.getParentMessageId())
                .orElseThrow(() -> new RuntimeException("Parent message not found"));

        SendMessageRequest messageRequest = new SendMessageRequest();
        messageRequest.setChatRoomId(request.getChatRoomId());
        messageRequest.setContent(request.getContent());
        messageRequest.setParentMessageId(request.getParentMessageId());
        messageRequest.setAttachmentUrl(request.getAttachmentUrl());
        messageRequest.setAttachmentName(request.getAttachmentName());
        messageRequest.setAttachmentType(request.getAttachmentType());

        return sendMessageToRoom(messageRequest, userId);
    }

    //  FILE UPLOADS

    public AttachmentUploadResponse uploadAttachment(MultipartFile file, Long roomId, Long userId) {
        // Verify user has access to room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(roomId, userId)) {
            throw new SecurityException("User does not have access to this chat room");
        }

        try {
            // Here you would implement your file upload logic
            // For now, return a mock response
            AttachmentUploadResponse response = new AttachmentUploadResponse();
            response.setFileName(file.getOriginalFilename());
            response.setFileSize(file.getSize());
            response.setFileType(file.getContentType());
            response.setUploadId(UUID.randomUUID().toString());
            response.setFileUrl("/uploads/" + response.getUploadId() + "_" + file.getOriginalFilename());

            return response;
        } catch (Exception e) {
            log.error("Failed to upload attachment: {}", e.getMessage());
            throw new RuntimeException("Failed to upload attachment");
        }
    }

    //  MENTIONS

    public List<ChatMessageDTO> getUserMentions(Long userId, int page, int size) {
        // This would search for messages that mention the user
        // For now, return empty list
        return new ArrayList<>();
    }

    public void markMentionAsRead(Long messageId, Long userId) {
        // Implementation for marking mentions as read
        log.debug("Marking mention as read for message {} by user {}", messageId, userId);
    }

    //  ADVANCED SEARCH

    public MessageSearchResponse advancedSearchMessages(MessageSearchRequest request, Long userId) {
        log.debug("Advanced search with query: '{}' by user: {}", request.getQuery(), userId);

        // Build the query conditions
        List<ChatRoom> userRooms = chatRoomRepository.findUserChatRooms(userId);
        List<Long> roomIds = userRooms.stream().map(ChatRoom::getId).collect(Collectors.toList());

        if (roomIds.isEmpty()) {
            return new MessageSearchResponse(new ArrayList<>(), 0, request.getPage(), request.getSize(), false, request.getQuery(), 0L);
        }

        // Calculate pagination
        PageRequest pageRequest = PageRequest.of(request.getPage(), request.getSize());

        // Perform search based on criteria
        List<ChatMessage> messages = searchMessagesWithCriteria(request, roomIds, pageRequest);

        // Count total results for pagination
        long totalResults = countSearchResults(request, roomIds);
        long totalPages = (totalResults + request.getSize() - 1) / request.getSize();
        boolean hasMore = request.getPage() < totalPages - 1;

        List<ChatMessageDTO> messageDTOs = messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());

        return new MessageSearchResponse(
                messageDTOs,
                (int) totalResults,
                request.getPage(),
                request.getSize(),
                hasMore,
                request.getQuery(),
                totalPages
        );
    }

    private List<ChatMessage> searchMessagesWithCriteria(MessageSearchRequest request, List<Long> roomIds, PageRequest pageRequest) {
        // If specific room is requested, filter to that room
        if (request.getChatRoomId() != null) {
            roomIds = roomIds.stream()
                    .filter(id -> id.equals(request.getChatRoomId()))
                    .collect(Collectors.toList());
        }

        if (roomIds.isEmpty()) {
            return new ArrayList<>();
        }

        // Use repository method with enhanced criteria
        return chatMessageRepository.searchMessagesWithCriteria(
                roomIds,
                request.getQuery(),
                request.getSenderId(),
                request.getMessageType(),
                request.getFromDate(),
                request.getToDate(),
                pageRequest
        );
    }

    private long countSearchResults(MessageSearchRequest request, List<Long> roomIds) {
        if (request.getChatRoomId() != null) {
            roomIds = roomIds.stream()
                    .filter(id -> id.equals(request.getChatRoomId()))
                    .collect(Collectors.toList());
        }

        if (roomIds.isEmpty()) {
            return 0;
        }

        return chatMessageRepository.countSearchResults(
                roomIds,
                request.getQuery(),
                request.getSenderId(),
                request.getMessageType(),
                request.getFromDate(),
                request.getToDate()
        );
    }

    public MessageContextResponse getMessageContext(Long messageId, int beforeCount, int afterCount, Long userId) {
        // Find the target message
        ChatMessage targetMessage = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        // Verify user has access to the room
        if (!chatRoomMemberRepository.existsByChatRoomIdAndUserId(targetMessage.getChatRoom().getId(), userId)) {
            throw new SecurityException("User does not have access to this message");
        }

        // Get messages before
        List<ChatMessage> messagesBefore = chatMessageRepository.findMessagesBeforeMessage(
                targetMessage.getChatRoom().getId(),
                targetMessage.getCreatedAt(),
                PageRequest.of(0, beforeCount)
        );

        // Get messages after
        List<ChatMessage> messagesAfter = chatMessageRepository.findMessagesAfterMessage(
                targetMessage.getChatRoom().getId(),
                targetMessage.getCreatedAt(),
                PageRequest.of(0, afterCount)
        );

        // Convert to DTOs
        List<ChatMessageDTO> beforeDTOs = messagesBefore.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());

        List<ChatMessageDTO> afterDTOs = messagesAfter.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());

        return new MessageContextResponse(
                new ChatMessageDTO(targetMessage),
                beforeDTOs,
                afterDTOs,
                targetMessage.getChatRoom().getId(),
                targetMessage.getChatRoom().getRoomName()
        );
    }

    //  UTILITIES

    private void sendSystemMessage(ChatRoom room, String content, ChatMessage.MessageType type) {
        ChatMessage systemMessage = new ChatMessage();
        systemMessage.setContent(content);
        systemMessage.setSenderId(0L); // System user
        systemMessage.setSenderUsername("System");
        systemMessage.setSenderName("System");
        systemMessage.setType(type);
        systemMessage.setChatRoom(room);
        systemMessage.setCreatedAt(LocalDateTime.now());

        chatMessageRepository.save(systemMessage);

        ChatMessageDTO messageDTO = new ChatMessageDTO(systemMessage);
        String destination = "/topic/chat/room/" + room.getId();
        messagingTemplate.convertAndSend(destination, messageDTO);
    }

    private void sendNotificationsToMembers(ChatRoom room, ChatMessageDTO message, Long senderId) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoomIdOrderByJoinedAtAsc(room.getId());

        for (ChatRoomMember member : members) {
            if (!member.getUserId().equals(senderId) &&
                    (member.getNotificationsEnabled() == null || member.getNotificationsEnabled())) {

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


    private void broadcastMessageUpdate(Long roomId, ChatMessageDTO message, String action) {
        Map<String, Object> messageUpdate = new HashMap<>();
        messageUpdate.put("message", message);
        messageUpdate.put("action", action);
        messageUpdate.put("timestamp", LocalDateTime.now());

        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/message-updates", messageUpdate);
    }


    //  BACKWARD COMPATIBILITY METHODS

    public ChatMessageDTO sendMessage(String content, User sender, Long taskId) {
        log.debug("Sending backward compatibility message by user: {} for task: {}", sender.getUsername(), taskId);

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
        UserPrincipal currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new SecurityException("No authenticated user");
        }

        ChatRoomDTO roomDTO = createChatRoom(request, currentUser.getId());
        return chatRoomRepository.findById(roomDTO.getId()).orElseThrow();
    }

    //  ONLINE USERS MANAGEMENT

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
        log.info("User {} is now online with session {}", user.getUsername(), sessionId);
    }

    public void removeOnlineUser(String sessionId) {
        OnlineUser user = onlineUsers.remove(sessionId);
        if (user != null) {
            userSessions.remove(user.getUserId());
            broadcastOnlineUsersUpdate();
            broadcastUserStatusChange(user, "left");
            log.info("User {} went offline", user.getUsername());
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
                log.debug("User {} updated status to: {}", user.getUsername(), status);
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
            log.debug("No authentication context available: {}", e.getMessage());
        }
        return null;
    }
}