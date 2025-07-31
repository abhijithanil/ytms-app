package com.insp17.ytms.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.insp17.ytms.entity.ChatRoom;
import com.insp17.ytms.entity.ChatRoomMember;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatRoomDTO {

    //  BASIC ROOM INFORMATION 
    private Long id;
    private String roomName;
    private String roomDescription;
    private ChatRoom.RoomType roomType;
    private Boolean isPrivate;
    private Long createdBy;
    private String createdByUsername;
    private String createdByDisplayName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastMessageAt;

    private Boolean isArchived;

    //  RELATIONSHIP SPECIFIC FIELDS 

    // For task-related chats
    private Long taskId;
    private String taskTitle;
    private String taskStatus;

    // For direct messages
    private Long dmParticipantId;
    private String dmParticipantName;
    private String dmParticipantUsername;
    private String dmParticipantEmail;
    private String dmParticipantStatus; // online, away, busy, offline
    private String dmParticipantAvatar;

    //  STATISTICS AND COUNTS 
    private Long memberCount;
    private Long messageCount;
    private Long unreadCount;
    private Long threadCount;
    private Long fileCount;

    //  LATEST MESSAGE PREVIEW 
    private ChatMessageDTO lastMessage;
    private String lastMessagePreview; // Shortened version for lists

    //  MEMBER INFORMATION 
    @Builder.Default
    private List<ChatRoomMemberDTO> members = new ArrayList<>();

    // Current user's membership info
    private ChatRoomMember.MemberRole userRole;
    private Boolean isMuted;
    private Boolean notificationsEnabled;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastReadAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime userJoinedAt;

    //  ROOM SETTINGS 
    private Boolean canInviteMembers;
    private Boolean canManageMembers;
    private Boolean canDeleteMessages;
    private Boolean canEditRoom;
    private Boolean canLeaveRoom;
    private Boolean canArchiveRoom;

    //  DISPLAY HELPERS 
    private String displayName; // Computed display name based on room type
    private String displayDescription; // Computed description
    private String roomIcon; // Icon identifier for frontend
    private String statusIndicator; // For DMs: online status
    private String roomColor; // Optional color coding

    //  PINNED MESSAGES 
    @Builder.Default
    private List<ChatMessageDTO> pinnedMessages = new ArrayList<>();

    //  ROOM ACTIVITY 
    private Boolean hasUnreadMentions;
    private Long unreadMentionsCount;
    private Boolean hasUnreadHighPriority;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastActivityAt;

    //  CONSTRUCTORS AND FACTORY METHODS 

    /**
     * Create ChatRoomDTO from ChatRoom entity
     */
    public ChatRoomDTO(ChatRoom chatRoom) {
        this.id = chatRoom.getId();
        this.roomName = chatRoom.getRoomName();
        this.roomDescription = chatRoom.getRoomDescription();
        this.roomType = chatRoom.getRoomType();
        this.isPrivate = chatRoom.getIsPrivate();
        this.createdBy = chatRoom.getCreatedBy();
        this.createdAt = chatRoom.getCreatedAt();
        this.updatedAt = chatRoom.getUpdatedAt();
        this.lastMessageAt = chatRoom.getLastMessageAt();
        this.isArchived = chatRoom.getIsArchived();
        this.taskId = chatRoom.getTaskId();
        this.dmParticipantId = chatRoom.getDmParticipantId();

        // Set defaults
        this.memberCount = (long) (chatRoom.getMembers() != null ? chatRoom.getMembers().size() : 0);
        this.messageCount = (long) (chatRoom.getMessages() != null ? chatRoom.getMessages().size() : 0);
        this.isArchived = chatRoom.getIsArchived() != null ? chatRoom.getIsArchived() : false;
        this.isPrivate = chatRoom.getIsPrivate() != null ? chatRoom.getIsPrivate() : false;
        this.unreadCount = 0L;
        this.isMuted = false;
        this.notificationsEnabled = true;

        // Set display properties
        this.displayName = generateDisplayName();
        this.roomIcon = generateRoomIcon();

        // Set default permissions
        setDefaultPermissions();
    }

    /**
     * Create ChatRoomDTO with user-specific information
     */
    public static ChatRoomDTO fromChatRoomWithUserInfo(ChatRoom chatRoom, ChatRoomMember userMembership, Long unreadCount) {
        ChatRoomDTO dto = new ChatRoomDTO(chatRoom);

        if (userMembership != null) {
            dto.setUserRole(userMembership.getRole());
            dto.setIsMuted(userMembership.getIsMuted());
            dto.setNotificationsEnabled(userMembership.getNotificationsEnabled());
            dto.setLastReadAt(userMembership.getLastReadAt());
            dto.setUserJoinedAt(userMembership.getJoinedAt());

            // Set permissions based on role
            dto.setPermissionsFromRole(userMembership.getRole());
        }

        dto.setUnreadCount(unreadCount != null ? unreadCount : 0L);

        return dto;
    }

    //  HELPER METHODS 

    /**
     * Generate appropriate display name based on room type
     */
    private String generateDisplayName() {
        if (this.roomType == null) return "Unknown Room";

        switch (this.roomType) {
            case DIRECT_MESSAGE:
                return this.dmParticipantName != null ? this.dmParticipantName : this.dmParticipantUsername;
            case TASK_CHAT:
                return this.taskTitle != null ? "Task: " + this.taskTitle : "Task Chat #" + this.taskId;
            case GLOBAL_CHAT:
                return this.roomName != null ? this.roomName : "General";
            case GROUP_CHAT:
            default:
                return this.roomName;
        }
    }

    /**
     * Generate room icon identifier for frontend
     */
    private String generateRoomIcon() {
        if (this.roomType == null) return "message-circle";

        switch (this.roomType) {
            case DIRECT_MESSAGE:
                return "user";
            case GROUP_CHAT:
                return this.isPrivate != null && this.isPrivate ? "lock" : "users";
            case TASK_CHAT:
                return "task";
            case GLOBAL_CHAT:
                return "globe";
            default:
                return "message-circle";
        }
    }

    /**
     * Set default permissions
     */
    private void setDefaultPermissions() {
        // Set conservative defaults
        this.canInviteMembers = false;
        this.canManageMembers = false;
        this.canDeleteMessages = false;
        this.canEditRoom = false;
        this.canLeaveRoom = true;
        this.canArchiveRoom = false;
    }

    /**
     * Set user permissions based on their role
     */
    private void setPermissionsFromRole(ChatRoomMember.MemberRole role) {
        if (role == null) {
            setDefaultPermissions();
            return;
        }

        switch (role) {
            case OWNER:
                this.canInviteMembers = true;
                this.canManageMembers = true;
                this.canDeleteMessages = true;
                this.canEditRoom = true;
                this.canLeaveRoom = true;
                this.canArchiveRoom = true;
                break;
            case ADMIN:
                this.canInviteMembers = true;
                this.canManageMembers = true;
                this.canDeleteMessages = true;
                this.canEditRoom = false;
                this.canLeaveRoom = true;
                this.canArchiveRoom = false;
                break;
            case MEMBER:
            default:
                this.canInviteMembers = this.isPrivate != null && !this.isPrivate;
                this.canManageMembers = false;
                this.canDeleteMessages = false;
                this.canEditRoom = false;
                this.canLeaveRoom = true;
                this.canArchiveRoom = false;
                break;
        }

        // Special cases
        if (this.roomType == ChatRoom.RoomType.DIRECT_MESSAGE) {
            this.canLeaveRoom = false; // Can't leave DMs, only archive
            this.canInviteMembers = false;
        }
    }

    /**
     * Generate last message preview for list views
     */
    public String generateLastMessagePreview() {
        if (this.lastMessage == null) {
            return "No messages yet";
        }

        String content = this.lastMessage.getContent();
        String senderName = this.lastMessage.getSenderName();

        // Handle different message types
        if (this.lastMessage.getType() != null) {
            switch (this.lastMessage.getType()) {
                case FILE:
                    return senderName + " shared a file";
                case IMAGE:
                    return senderName + " shared an image";
                case JOIN:
                    return content; // Already formatted like "User joined"
                case LEAVE:
                    return content; // Already formatted like "User left"
                case SYSTEM:
                    return content;
                case CHAT:
                default:
                    String preview = content != null && content.length() > 50 ? content.substring(0, 50) + "..." : content;
                    return this.roomType == ChatRoom.RoomType.DIRECT_MESSAGE ? preview : senderName + ": " + preview;
            }
        }

        // Fallback
        String preview = content != null && content.length() > 50 ? content.substring(0, 50) + "..." : content;
        return this.roomType == ChatRoom.RoomType.DIRECT_MESSAGE ? preview : senderName + ": " + preview;
    }

    //  CONVENIENCE METHODS 

    public boolean isDirectMessage() {
        return this.roomType == ChatRoom.RoomType.DIRECT_MESSAGE;
    }

    public boolean isGroupChat() {
        return this.roomType == ChatRoom.RoomType.GROUP_CHAT;
    }

    public boolean isTaskChat() {
        return this.roomType == ChatRoom.RoomType.TASK_CHAT;
    }

    public boolean isGlobalChat() {
        return this.roomType == ChatRoom.RoomType.GLOBAL_CHAT;
    }

    public boolean hasUnreadMessages() {
        return this.unreadCount != null && this.unreadCount > 0;
    }

    public boolean isUserOwner() {
        return this.userRole == ChatRoomMember.MemberRole.OWNER;
    }

    public boolean isUserAdmin() {
        return this.userRole == ChatRoomMember.MemberRole.ADMIN || isUserOwner();
    }

    public boolean canUserManage() {
        return this.canManageMembers != null && this.canManageMembers;
    }

    public String getFormattedMemberCount() {
        if (this.memberCount == null) return "0";
        if (this.memberCount == 1) return "1 member";
        return this.memberCount + " members";
    }

    public String getFormattedUnreadCount() {
        if (this.unreadCount == null || this.unreadCount == 0) return "";
        if (this.unreadCount > 99) return "99+";
        return this.unreadCount.toString();
    }

    /**
     * Check if room is active (has recent activity)
     */
    public boolean isActive() {
        if (this.lastMessageAt == null) return false;
        return this.lastMessageAt.isAfter(LocalDateTime.now().minusDays(7));
    }

    /**
     * Get room status for display
     */
    public String getRoomStatus() {
        if (this.isArchived != null && this.isArchived) return "archived";
        if (!isActive()) return "inactive";
        if (hasUnreadMessages()) return "unread";
        return "active";
    }

    /**
     * Get priority level for sorting
     */
    public int getSortPriority() {
        if (this.hasUnreadMentions != null && this.hasUnreadMentions) return 1;
        if (hasUnreadMessages()) return 2;
        if (this.roomType == ChatRoom.RoomType.DIRECT_MESSAGE) return 3;
        if (this.roomType == ChatRoom.RoomType.GLOBAL_CHAT) return 4;
        return 5;
    }

    //  BUILDER PATTERN ENHANCEMENTS 

    public static class ChatRoomDTOBuilder {

        public ChatRoomDTOBuilder withUserPermissions(ChatRoomMember.MemberRole role) {
            ChatRoomDTO temp = new ChatRoomDTO();
            temp.setPermissionsFromRole(role);

            this.canInviteMembers = temp.canInviteMembers;
            this.canManageMembers = temp.canManageMembers;
            this.canDeleteMessages = temp.canDeleteMessages;
            this.canEditRoom = temp.canEditRoom;
            this.canLeaveRoom = temp.canLeaveRoom;
            this.canArchiveRoom = temp.canArchiveRoom;

            return this;
        }

        public ChatRoomDTOBuilder withDMParticipant(Long participantId, String participantName, String participantUsername, String status) {
            this.dmParticipantId = participantId;
            this.dmParticipantName = participantName;
            this.dmParticipantUsername = participantUsername;
            this.dmParticipantStatus = status;
            return this;
        }

        public ChatRoomDTOBuilder withTaskInfo(Long taskId, String taskTitle, String taskStatus) {
            this.taskId = taskId;
            this.taskTitle = taskTitle;
            this.taskStatus = taskStatus;
            return this;
        }

        public ChatRoomDTOBuilder withCounts(Long memberCount, Long messageCount, Long unreadCount) {
            this.memberCount = memberCount;
            this.messageCount = messageCount;
            this.unreadCount = unreadCount;
            return this;
        }
    }

    //  JSON SERIALIZATION HELPERS 

    /**
     * Get minimal version for list views
     */
    public ChatRoomDTO toMinimal() {
        return ChatRoomDTO.builder()
                .id(this.id)
                .roomName(this.roomName)
                .roomType(this.roomType)
                .displayName(this.displayName)
                .roomIcon(this.roomIcon)
                .unreadCount(this.unreadCount)
                .lastMessageAt(this.lastMessageAt)
                .lastMessagePreview(generateLastMessagePreview())
                .isPrivate(this.isPrivate)
                .isArchived(this.isArchived)
                .memberCount(this.memberCount)
                .dmParticipantStatus(this.dmParticipantStatus)
                .build();
    }

    /**
     * Get detailed version with all information
     */
    public ChatRoomDTO toDetailed() {
        this.lastMessagePreview = generateLastMessagePreview();
        this.displayName = generateDisplayName();
        this.roomIcon = generateRoomIcon();
        return this;
    }

    @Override
    public String toString() {
        return "ChatRoomDTO{" +
                "id=" + id +
                ", roomName='" + roomName + '\'' +
                ", roomType=" + roomType +
                ", memberCount=" + memberCount +
                ", unreadCount=" + unreadCount +
                ", isPrivate=" + isPrivate +
                '}';
    }
}