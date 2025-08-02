package com.insp17.ytms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "chat_channels")
public class ChatChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private ChannelType type;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_private")
    private boolean isPrivate;

    // Constructors
    public ChatChannel() {
        this.createdAt = LocalDateTime.now();
    }

    public ChatChannel(String name, String description, ChannelType type, User createdBy, boolean isPrivate) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.createdBy = createdBy;
        this.isPrivate = isPrivate;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ChannelType getType() { return type; }
    public void setType(ChannelType type) { this.type = type; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isPrivate() { return isPrivate; }
    public void setPrivate(boolean isPrivate) { this.isPrivate = isPrivate; }

    public enum ChannelType {
        GENERAL,    // General discussion
        PROJECT,    // Project-specific
        TASK,       // Task-specific
        DIRECT      // Direct message channel
    }
}