package com.insp17.ytms.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.insp17.ytms.entity.ChatRoomMember;
import com.insp17.ytms.entity.User;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatRoomMemberDTO {

    // === BASIC MEMBER INFORMATION ===
    private Long id; // ChatRoomMember ID
    private Long chatRoomId;
    private Long userId;
    private String username;
    private String displayName;
    private String email;
    private String firstName;
    private String lastName;

    // === ROLE AND PERMISSIONS ===
    private ChatRoomMember.MemberRole role;
    private String roleDisplayName;
    private Boolean canManageMembers;
    private Boolean canDeleteMessages;
    private Boolean canEditRoom;
    private Boolean canKickMembers;

    // === MEMBERSHIP DETAILS ===
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime joinedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastReadAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastActiveAt;

    // === NOTIFICATION SETTINGS ===
    private Boolean isMuted;
    private Boolean notificationsEnabled;
    private String notificationLevel; // all, mentions, none

    // === PRESENCE AND STATUS ===
    private String status; // online, away, busy, offline
    private String statusMessage;
    private Boolean isOnline;
    private String lastSeenDisplay;

    // === DISPLAY INFORMATION ===
    private String avatar; // URL to avatar image
    private String initials; // For avatar fallback
    private String profileColor; // Color for avatar background
    private String timezone;
    private String locale;

    // === ACTIVITY METRICS ===
    private Long messageCount; // Messages sent in this room
    private Long unreadCount; // Unread messages for this member
    private Boolean hasUnreadMentions;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastMessageAt; // Last message sent by this member

    // === ROOM-SPECIFIC INFO ===
    private String joinMethod; // invited, added, joined
    private Long invitedBy; // User ID who invited this member
    private String invitedByName;
    private Boolean isOwner;
    private Boolean isAdmin;
    private Boolean isModerator;

    // === DISPLAY HELPERS ===
    private String memberSince; // Formatted join date
    private String displayStatus; // Combined status and message
    private Boolean showAsActive; // Whether to show as active member
    private Integer sortOrder; // For member list ordering

    // === CONSTRUCTORS AND FACTORY METHODS ===

    /**
     * Create ChatRoomMemberDTO from ChatRoomMember entity
     */
    public ChatRoomMemberDTO(ChatRoomMember member) {
        this.id = member.getId();
        this.chatRoomId = member.getChatRoom() != null ? member.getChatRoom().getId() : null;
        this.userId = member.getUserId();
        this.username = member.getUsername();
        this.displayName = member.getDisplayName();
        this.role = member.getRole();
        this.joinedAt = member.getJoinedAt();
        this.lastReadAt = member.getLastReadAt();
        this.isMuted = member.getIsMuted();
        this.notificationsEnabled = member.getNotificationsEnabled();

        // Set computed fields
        this.roleDisplayName = formatRoleDisplayName(member.getRole());
        this.initials = generateInitials(member.getDisplayName(), member.getUsername());
        this.memberSince = formatMemberSince(member.getJoinedAt());
        this.isOwner = member.getRole() == ChatRoomMember.MemberRole.OWNER;
        this.isAdmin = member.getRole() == ChatRoomMember.MemberRole.ADMIN || this.isOwner;
        this.isModerator = this.isAdmin; // Assuming admins are moderators

        // Set permissions
        setPermissionsFromRole(member.getRole());

        // Set defaults
        this.status = "offline";
        this.isOnline = false;
        this.showAsActive = true;
        this.messageCount = 0L;
        this.unreadCount = 0L;
        this.hasUnreadMentions = false;
        this.notificationLevel = "all";
        this.joinMethod = "unknown";
    }

    /**
     * Create ChatRoomMemberDTO with User information
     */
    public static ChatRoomMemberDTO fromMemberWithUser(ChatRoomMember member, User user) {
        ChatRoomMemberDTO dto = new ChatRoomMemberDTO(member);

        if (user != null) {
            dto.setEmail(user.getEmail());
            dto.setFirstName(user.getFirstName());
            dto.setLastName(user.getLastName());
            dto.setDisplayName(generateDisplayName(user.getFirstName(), user.getLastName(), user.getUsername()));
            dto.setInitials(generateInitials(dto.getDisplayName(), user.getUsername()));

            // Generate profile color based on user ID
            dto.setProfileColor(generateProfileColor(user.getId()));
        }

        return dto;
    }

    /**
     * Create ChatRoomMemberDTO with presence information
     */
    public static ChatRoomMemberDTO withPresence(ChatRoomMember member, User user,
                                                 String status, LocalDateTime lastActiveAt) {
        ChatRoomMemberDTO dto = fromMemberWithUser(member, user);

        dto.setStatus(status);
        dto.setLastActiveAt(lastActiveAt);
        dto.setIsOnline("online".equals(status));
        dto.setLastSeenDisplay(formatLastSeen(lastActiveAt, status));
        dto.setDisplayStatus(formatDisplayStatus(status, null));

        return dto;
    }

    /**
     * Create ChatRoomMemberDTO with activity metrics
     */
    public static ChatRoomMemberDTO withActivity(ChatRoomMember member, User user,
                                                 Long messageCount, LocalDateTime lastMessageAt,
                                                 Long unreadCount, Boolean hasUnreadMentions) {
        ChatRoomMemberDTO dto = fromMemberWithUser(member, user);

        dto.setMessageCount(messageCount);
        dto.setLastMessageAt(lastMessageAt);
        dto.setUnreadCount(unreadCount);
        dto.setHasUnreadMentions(hasUnreadMentions);

        return dto;
    }

    // === HELPER METHODS ===

    /**
     * Set permissions based on member role
     */
    private void setPermissionsFromRole(ChatRoomMember.MemberRole role) {
        switch (role) {
            case OWNER:
                this.canManageMembers = true;
                this.canDeleteMessages = true;
                this.canEditRoom = true;
                this.canKickMembers = true;
                this.sortOrder = 1;
                break;
            case ADMIN:
                this.canManageMembers = true;
                this.canDeleteMessages = true;
                this.canEditRoom = false;
                this.canKickMembers = true;
                this.sortOrder = 2;
                break;
            case MEMBER:
            default:
                this.canManageMembers = false;
                this.canDeleteMessages = false;
                this.canEditRoom = false;
                this.canKickMembers = false;
                this.sortOrder = 3;
                break;
        }
    }

    /**
     * Generate display name from user information
     */
    private static String generateDisplayName(String firstName, String lastName, String username) {
        if (firstName != null && !firstName.trim().isEmpty()) {
            if (lastName != null && !lastName.trim().isEmpty()) {
                return firstName + " " + lastName;
            }
            return firstName;
        }
        return username;
    }

    /**
     * Generate initials for avatar
     */
    private static String generateInitials(String displayName, String username) {
        if (displayName != null && displayName.contains(" ")) {
            String[] parts = displayName.trim().split("\\s+");
            if (parts.length >= 2) {
                return (parts[0].charAt(0) + "" + parts[parts.length - 1].charAt(0)).toUpperCase();
            }
        }

        String name = displayName != null ? displayName : username;
        return name != null && !name.isEmpty() ? name.substring(0, 1).toUpperCase() : "?";
    }

    /**
     * Generate profile color based on user ID
     */
    private static String generateProfileColor(Long userId) {
        String[] colors = {
                "#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399",
                "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#fb7185"
        };

        if (userId == null) return colors[0];

        int index = (int) (userId % colors.length);
        return colors[index];
    }

    /**
     * Format role for display
     */
    private String formatRoleDisplayName(ChatRoomMember.MemberRole role) {
        switch (role) {
            case OWNER:
                return "Owner";
            case ADMIN:
                return "Admin";
            case MEMBER:
            default:
                return "Member";
        }
    }

    /**
     * Format member since date
     */
    private String formatMemberSince(LocalDateTime joinedAt) {
        if (joinedAt == null) return "Unknown";

        LocalDateTime now = LocalDateTime.now();
        long days = ChronoUnit.DAYS.between(joinedAt, now);

        if (days == 0) {
            return "Today";
        } else if (days == 1) {
            return "Yesterday";
        } else if (days < 7) {
            return days + " days ago";
        } else if (days < 30) {
            long weeks = days / 7;
            return weeks + " week" + (weeks > 1 ? "s" : "") + " ago";
        } else if (days < 365) {
            long months = days / 30;
            return months + " month" + (months > 1 ? "s" : "") + " ago";
        } else {
            return joinedAt.format(DateTimeFormatter.ofPattern("MMM yyyy"));
        }
    }

    /**
     * Format last seen display
     */
    private static String formatLastSeen(LocalDateTime lastActiveAt, String status) {
        if ("online".equals(status)) {
            return "Online";
        }

        if (lastActiveAt == null) {
            return "Last seen unknown";
        }

        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(lastActiveAt, now);

        if (minutes < 1) {
            return "Active now";
        } else if (minutes < 60) {
            return "Active " + minutes + " min ago";
        } else if (minutes < 1440) { // 24 hours
            long hours = minutes / 60;
            return "Active " + hours + " hour" + (hours > 1 ? "s" : "") + " ago";
        } else {
            long days = minutes / 1440;
            if (days < 7) {
                return "Active " + days + " day" + (days > 1 ? "s" : "") + " ago";
            } else {
                return "Last seen " + lastActiveAt.format(DateTimeFormatter.ofPattern("MMM d"));
            }
        }
    }

    /**
     * Format display status
     */
    private static String formatDisplayStatus(String status, String statusMessage) {
        if (statusMessage != null && !statusMessage.trim().isEmpty()) {
            return statusMessage;
        }

        switch (status) {
            case "online":
                return "Online";
            case "away":
                return "Away";
            case "busy":
                return "Busy";
            case "offline":
            default:
                return "Offline";
        }
    }

    // === CONVENIENCE METHODS ===

    public boolean isActiveRole() {
        return this.role == ChatRoomMember.MemberRole.OWNER ||
                this.role == ChatRoomMember.MemberRole.ADMIN;
    }

    public boolean canManage() {
        return this.canManageMembers != null && this.canManageMembers;
    }

    public boolean canModerate() {
        return this.canDeleteMessages != null && this.canDeleteMessages;
    }

    public boolean isRecentlyActive() {
        if (this.lastActiveAt == null) return false;
        return this.lastActiveAt.isAfter(LocalDateTime.now().minusHours(1));
    }

    public boolean hasRecentMessages() {
        if (this.lastMessageAt == null) return false;
        return this.lastMessageAt.isAfter(LocalDateTime.now().minusDays(1));
    }

    public String getStatusIcon() {
        switch (this.status) {
            case "online":
                return "🟢";
            case "away":
                return "🟡";
            case "busy":
                return "🔴";
            case "offline":
            default:
                return "⚫";
        }
    }

    public String getRoleBadge() {
        switch (this.role) {
            case OWNER:
                return "👑";
            case ADMIN:
                return "🛡️";
            case MEMBER:
            default:
                return "";
        }
    }

    /**
     * Get member's activity level for sorting/display
     */
    public String getActivityLevel() {
        if (this.isOnline) return "online";
        if (isRecentlyActive()) return "recent";
        if (hasRecentMessages()) return "active";
        return "inactive";
    }

    /**
     * Get notification preferences summary
     */
    public String getNotificationSummary() {
        if (!this.notificationsEnabled) return "Notifications off";
        if (this.isMuted) return "Muted";

        switch (this.notificationLevel) {
            case "mentions":
                return "Mentions only";
            case "none":
                return "Silent";
            case "all":
            default:
                return "All messages";
        }
    }

    /**
     * Check if member should be highlighted in UI
     */
    public boolean shouldHighlight() {
        return this.hasUnreadMentions ||
                (this.isOnline && this.role == ChatRoomMember.MemberRole.OWNER);
    }

    /**
     * Get CSS classes for member display
     */
    public String getCssClasses() {
        StringBuilder classes = new StringBuilder("chat-member");

        classes.append(" role-").append(this.role.name().toLowerCase());
        classes.append(" status-").append(this.status);

        if (this.isOnline) classes.append(" online");
        if (this.isMuted) classes.append(" muted");
        if (shouldHighlight()) classes.append(" highlighted");
        if (isActiveRole()) classes.append(" staff");

        return classes.toString();
    }

    // === BUILDER PATTERN ENHANCEMENTS ===

    public static class ChatRoomMemberDTOBuilder {

        public ChatRoomMemberDTOBuilder withUserInfo(User user) {
            if (user != null) {
                this.userId = user.getId();
                this.username = user.getUsername();
                this.email = user.getEmail();
                this.firstName = user.getFirstName();
                this.lastName = user.getLastName();
                this.displayName = generateDisplayName(user.getFirstName(), user.getLastName(), user.getUsername());
                this.initials = generateInitials(this.displayName, user.getUsername());
                this.profileColor = generateProfileColor(user.getId());
            }
            return this;
        }

        public ChatRoomMemberDTOBuilder withPresence(String status, LocalDateTime lastActiveAt) {
            this.status = status;
            this.lastActiveAt = lastActiveAt;
            this.isOnline = "online".equals(status);
            this.lastSeenDisplay = formatLastSeen(lastActiveAt, status);
            this.displayStatus = formatDisplayStatus(status, this.statusMessage);
            return this;
        }

        public ChatRoomMemberDTOBuilder withActivity(Long messageCount, LocalDateTime lastMessageAt,
                                                     Long unreadCount, Boolean hasUnreadMentions) {
            this.messageCount = messageCount;
            this.lastMessageAt = lastMessageAt;
            this.unreadCount = unreadCount;
            this.hasUnreadMentions = hasUnreadMentions;
            return this;
        }

        public ChatRoomMemberDTOBuilder withNotifications(Boolean enabled, Boolean muted, String level) {
            this.notificationsEnabled = enabled;
            this.isMuted = muted;
            this.notificationLevel = level;
            return this;
        }

        public ChatRoomMemberDTOBuilder withInviteInfo(String joinMethod, Long invitedBy, String invitedByName) {
            this.joinMethod = joinMethod;
            this.invitedBy = invitedBy;
            this.invitedByName = invitedByName;
            return this;
        }
    }

    // === SERIALIZATION HELPERS ===

    /**
     * Get minimal version for member lists
     */
    public ChatRoomMemberDTO toMinimal() {
        return ChatRoomMemberDTO.builder()
                .id(this.id)
                .userId(this.userId)
                .username(this.username)
                .displayName(this.displayName)
                .role(this.role)
                .roleDisplayName(this.roleDisplayName)
                .status(this.status)
                .isOnline(this.isOnline)
                .initials(this.initials)
                .profileColor(this.profileColor)
                .isOwner(this.isOwner)
                .isAdmin(this.isAdmin)
                .sortOrder(this.sortOrder)
                .build();
    }

    /**
     * Get detailed version with all information
     */
    public ChatRoomMemberDTO toDetailed() {
        // Refresh computed fields
        this.memberSince = formatMemberSince(this.joinedAt);
        this.lastSeenDisplay = formatLastSeen(this.lastActiveAt, this.status);
        this.displayStatus = formatDisplayStatus(this.status, this.statusMessage);

        return this;
    }

    /**
     * Get public version (hide sensitive information)
     */
    public ChatRoomMemberDTO toPublic() {
        ChatRoomMemberDTO publicDto = toMinimal();
        publicDto.setEmail(null); // Hide email from other members
        publicDto.setLastReadAt(null); // Hide read status
        publicDto.setUnreadCount(null); // Hide personal unread count
        return publicDto;
    }

    @Override
    public String toString() {
        return "ChatRoomMemberDTO{" +
                "id=" + id +
                ", userId=" + userId +
                ", username='" + username + '\'' +
                ", displayName='" + displayName + '\'' +
                ", role=" + role +
                ", status='" + status + '\'' +
                ", isOnline=" + isOnline +
                '}';
    }
}