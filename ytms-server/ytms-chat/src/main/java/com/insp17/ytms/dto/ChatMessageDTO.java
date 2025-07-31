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

    // Reactions
    private String reactions;
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
        this.reactions = message.getReactions();
        this.attachmentUrl = message.getAttachmentUrl();
        this.attachmentName = message.getAttachmentName();
        this.attachmentType = message.getAttachmentType();

        if (message.getChatRoom() != null) {
            this.chatRoomId = message.getChatRoom().getId();
        }
    }
}