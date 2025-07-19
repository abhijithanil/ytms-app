package com.insp17.ytms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "youtube_channels")
@Getter
@Setter
@NoArgsConstructor
public class YouTubeChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String channelName;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, unique = true, length = 100)
    private String channelId; // YouTube Channel ID

    @Column(length = 500)
    private String channelUrl;

    @Column(length = 500)
    private String thumbnailUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "youtube_channel_user_access",
            joinColumns = @JoinColumn(name = "channel_id"))
    @Column(name = "user_id")
    private Set<Long> usersWithAccess = new HashSet<>();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "added_by_user_id", nullable = false)
    private User addedBy;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "youtube_channel_owner_email")
    private String youtubeChannelOwnerEmail;

    // NEW: Add refresh token key field for multi-channel support
    @Column(name = "refresh_token_key")
    private String refreshTokenKey; // e.g., "YT_REFRESH_TOKEN_MAIN", "YT_REFRESH_TOKEN_GAMING"

    public YouTubeChannel(String channelName, String channelId, String channelUrl, User addedBy, String youtubeChannelOwnerEmail) {
        this.channelName = channelName;
        this.channelId = channelId;
        this.channelUrl = channelUrl;
        this.addedBy = addedBy;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.youtubeChannelOwnerEmail = youtubeChannelOwnerEmail;
        // Set default refresh token key based on channel name
        this.refreshTokenKey = "YT_REFRESH_TOKEN_" + channelName.toUpperCase().replaceAll("[^A-Z0-9]", "_");
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public void addUserAccess(Long userId) {
        if (this.usersWithAccess == null) {
            this.usersWithAccess = new HashSet<>();
        }
        if (!this.usersWithAccess.contains(userId)) {
            this.usersWithAccess.add(userId);
        }
    }

    public void removeUserAccess(Long userId) {
        if (this.usersWithAccess != null) {
            this.usersWithAccess.remove(userId);
        }
    }

    public boolean hasUserAccess(Long userId) {
        return this.usersWithAccess != null && this.usersWithAccess.contains(userId);
    }
}