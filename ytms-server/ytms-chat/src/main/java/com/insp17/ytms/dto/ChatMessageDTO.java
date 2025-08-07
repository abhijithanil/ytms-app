package com.insp17.ytms.dto;

import com.insp17.ytms.entity.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private String content;
    private Long senderId;
    private String senderUsername;
    private String senderName;
    private ChatMessage.MessageType type;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isEdited;
    private Boolean isDeleted;

    // Room information
    private Long chatRoomId;
    private Long taskId; // For backward compatibility

    // Thread support
    private Long parentMessageId;
    private Integer threadReplyCount;
    private List<ChatMessageDTO> threadReplies = new ArrayList<>();

    // NEW: Add parent message preview fields for better UI support
    private String parentMessageContent; // Preview of parent message content
    private String parentMessageSender; // Sender name of parent message
    private LocalDateTime parentMessageCreatedAt; // When parent was created

    private String reactions = "{}";
    private List<MessageReactionDTO> reactionsList = new ArrayList<>();

    // Attachments
    private String attachmentUrl;
    private String attachmentName;
    private String attachmentType;

    // Mentions
    private List<Long> mentionedUserIds = new ArrayList<>();

    // Read status (for DMs)
    private Boolean isRead;
    private LocalDateTime readAt;

    // NEW: Add message status flags
    private Boolean isPinned = false;
    private Boolean isSystemMessage = false;

    // NEW: Add edit history support
    private String originalContent; // For showing edit history
    private LocalDateTime lastEditedAt;

    // UPDATED: Enhanced constructor with parent message info
    public ChatMessageDTO(ChatMessage message) {
        this.id = message.getId();
        this.content = message.getContent();
        this.senderId = message.getSenderId();
        this.senderUsername = message.getSenderUsername();
        this.senderName = message.getSenderName();
        this.type = message.getType();
        this.createdAt = message.getCreatedAt();
        this.updatedAt = message.getUpdatedAt();
        this.isEdited = message.getIsEdited();
        this.isDeleted = message.getIsDeleted();
        this.taskId = message.getTaskId();
        this.parentMessageId = message.getParentMessageId();
        this.threadReplyCount = message.getThreadReplyCount();
        this.reactions = message.getReactions() != null ? message.getReactions() : "{}";
        this.attachmentUrl = message.getAttachmentUrl();
        this.attachmentName = message.getAttachmentName();
        this.attachmentType = message.getAttachmentType();

        // Set chat room ID
        if (message.getChatRoom() != null) {
            this.chatRoomId = message.getChatRoom().getId();
        }

        // Set system message flag
        this.isSystemMessage = message.getType() == ChatMessage.MessageType.SYSTEM ||
                message.getType() == ChatMessage.MessageType.JOIN ||
                message.getType() == ChatMessage.MessageType.LEAVE;

        // Set edit timestamps
        if (this.isEdited != null && this.isEdited) {
            this.lastEditedAt = message.getUpdatedAt();
        }
    }

    // NEW: Constructor with parent message info (for use in service layer)
    public ChatMessageDTO(ChatMessage message, ChatMessage parentMessage) {
        this(message); // Call the main constructor first

        // Add parent message info if available
        if (parentMessage != null) {
            this.parentMessageContent = parentMessage.getContent();
            this.parentMessageSender = parentMessage.getSenderName() != null ?
                    parentMessage.getSenderName() : parentMessage.getSenderUsername();
            this.parentMessageCreatedAt = parentMessage.getCreatedAt();
        }
    }

    // NEW: Helper method to check if this is a reply
    public boolean isReply() {
        return this.parentMessageId != null;
    }

    // NEW: Helper method to check if this is a thread starter
    public boolean hasReplies() {
        return this.threadReplyCount != null && this.threadReplyCount > 0;
    }

    // NEW: Helper method for getting safe reaction count
    public int getTotalReactionCount() {
        if (reactionsList != null) {
            return reactionsList.stream()
                    .mapToInt(MessageReactionDTO::getCount)
                    .sum();
        }
        return 0;
    }

    // NEW: Helper method to get content preview (useful for parent message preview)
    public String getContentPreview(int maxLength) {
        if (content == null) return "";
        if (content.length() <= maxLength) return content;
        return content.substring(0, maxLength) + "...";
    }

    // NEW: Helper method to determine if user can edit this message
    public boolean canEdit(Long currentUserId) {
        // User can edit their own messages, and system messages cannot be edited
        return currentUserId != null &&
                currentUserId.equals(this.senderId) &&
                !this.isSystemMessage &&
                (this.isDeleted == null || !this.isDeleted);
    }

    // NEW: Helper method to determine if user can delete this message
    public boolean canDelete(Long currentUserId) {
        // User can delete their own messages, and system messages cannot be deleted
        return currentUserId != null &&
                currentUserId.equals(this.senderId) &&
                !this.isSystemMessage &&
                (this.isDeleted == null || !this.isDeleted);
    }
}