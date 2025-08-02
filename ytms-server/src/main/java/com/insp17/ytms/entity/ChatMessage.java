package com.insp17.ytms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "channel_id", nullable = false)
    private ChatChannel channel;

    @Enumerated(EnumType.STRING)
    private MessageType messageType;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_edited")
    private boolean isEdited;

    @Column(name = "is_deleted")
    private boolean isDeleted;

    // For threading - reply to another message
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_message_id")
    private ChatMessage parentMessage;

    // Constructors
    public ChatMessage() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.isEdited = false;
        this.isDeleted = false;
    }

    public ChatMessage(String content, User sender, ChatChannel channel, MessageType messageType) {
        this.content = content;
        this.sender = sender;
        this.channel = channel;
        this.messageType = messageType;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.isEdited = false;
        this.isDeleted = false;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { 
        this.content = content;
        this.updatedAt = LocalDateTime.now();
        this.isEdited = true;
    }

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }

    public ChatChannel getChannel() { return channel; }
    public void setChannel(ChatChannel channel) { this.channel = channel; }

    public MessageType getMessageType() { return messageType; }
    public void setMessageType(MessageType messageType) { this.messageType = messageType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public boolean isEdited() { return isEdited; }
    public void setEdited(boolean isEdited) { this.isEdited = isEdited; }

    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean isDeleted) { this.isDeleted = isDeleted; }

    public ChatMessage getParentMessage() { return parentMessage; }
    public void setParentMessage(ChatMessage parentMessage) { this.parentMessage = parentMessage; }

    public enum MessageType {
        TEXT,           // Regular text message
        SYSTEM,         // System notification
        FILE,           // File attachment
        IMAGE,          // Image attachment
        TASK_UPDATE     // Task-related update
    }
}