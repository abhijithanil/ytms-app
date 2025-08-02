package com.insp17.ytms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_channel_membership")
public class UserChannelMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "channel_id", nullable = false)
    private ChatChannel channel;

    @Enumerated(EnumType.STRING)
    private MembershipRole role;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Column(name = "is_muted")
    private boolean isMuted;

    // Constructors
    public UserChannelMembership() {
        this.joinedAt = LocalDateTime.now();
        this.lastReadAt = LocalDateTime.now();
        this.isMuted = false;
    }

    public UserChannelMembership(User user, ChatChannel channel, MembershipRole role) {
        this.user = user;
        this.channel = channel;
        this.role = role;
        this.joinedAt = LocalDateTime.now();
        this.lastReadAt = LocalDateTime.now();
        this.isMuted = false;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public ChatChannel getChannel() { return channel; }
    public void setChannel(ChatChannel channel) { this.channel = channel; }

    public MembershipRole getRole() { return role; }
    public void setRole(MembershipRole role) { this.role = role; }

    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }

    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }

    public boolean isMuted() { return isMuted; }
    public void setMuted(boolean isMuted) { this.isMuted = isMuted; }

    public enum MembershipRole {
        MEMBER,     // Regular member
        ADMIN,      // Channel admin
        OWNER       // Channel owner
    }
}