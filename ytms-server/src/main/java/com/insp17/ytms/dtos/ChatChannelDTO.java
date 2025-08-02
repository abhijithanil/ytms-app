package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.ChatChannel;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public class ChatChannelDTO {
    private Long id;
    private String name;
    private String description;
    private ChatChannel.ChannelType type;
    private boolean isPrivate;
    private Long memberCount;
    private Long unreadCount;
    private UserSummary createdBy;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    // Constructors
    public ChatChannelDTO() {}

    public ChatChannelDTO(ChatChannel channel) {
        this.id = channel.getId();
        this.name = channel.getName();
        this.description = channel.getDescription();
        this.type = channel.getType();
        this.isPrivate = channel.isPrivate();
        this.createdBy = channel.getCreatedBy() != null ? new UserSummary(channel.getCreatedBy()) : null;
        this.createdAt = channel.getCreatedAt();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ChatChannel.ChannelType getType() { return type; }
    public void setType(ChatChannel.ChannelType type) { this.type = type; }

    public boolean isPrivate() { return isPrivate; }
    public void setPrivate(boolean isPrivate) { this.isPrivate = isPrivate; }

    public Long getMemberCount() { return memberCount; }
    public void setMemberCount(Long memberCount) { this.memberCount = memberCount; }

    public Long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(Long unreadCount) { this.unreadCount = unreadCount; }

    public UserSummary getCreatedBy() { return createdBy; }
    public void setCreatedBy(UserSummary createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}