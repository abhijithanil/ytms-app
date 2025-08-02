package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.ChatMessage;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public class ChatMessageDTO {
    private Long id;
    private String content;
    private UserSummary sender;
    private Long channelId;
    private ChatMessage.MessageType messageType;
    private boolean isEdited;
    private Long parentMessageId;
    private Integer replyCount;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // Constructors
    public ChatMessageDTO() {}

    public ChatMessageDTO(ChatMessage message) {
        this.id = message.getId();
        this.content = message.getContent();
        this.sender = message.getSender() != null ? new UserSummary(message.getSender()) : null;
        this.channelId = message.getChannel() != null ? message.getChannel().getId() : null;
        this.messageType = message.getMessageType();
        this.isEdited = message.isEdited();
        this.parentMessageId = message.getParentMessage() != null ? message.getParentMessage().getId() : null;
        this.createdAt = message.getCreatedAt();
        this.updatedAt = message.getUpdatedAt();
        this.replyCount = 0; // Will be set by service if needed
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public UserSummary getSender() { return sender; }
    public void setSender(UserSummary sender) { this.sender = sender; }

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public ChatMessage.MessageType getMessageType() { return messageType; }
    public void setMessageType(ChatMessage.MessageType messageType) { this.messageType = messageType; }

    public boolean isEdited() { return isEdited; }
    public void setEdited(boolean isEdited) { this.isEdited = isEdited; }

    public Long getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(Long parentMessageId) { this.parentMessageId = parentMessageId; }

    public Integer getReplyCount() { return replyCount; }
    public void setReplyCount(Integer replyCount) { this.replyCount = replyCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}