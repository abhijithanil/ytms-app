package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.YouTubeChannel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

// Main DTO for YouTube Channel
@Data
@NoArgsConstructor
@AllArgsConstructor
public class YouTubeChannelDTO {
    private Long id;

    @NotBlank(message = "Channel name is required")
    @Size(max = 100, message = "Channel name must not exceed 100 characters")
    private String channelName;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotBlank(message = "Channel ID is required")
    @Size(max = 100, message = "Channel ID must not exceed 100 characters")
    private String channelId;

    @Size(max = 500, message = "Channel URL must not exceed 500 characters")
    private String channelUrl;

    @Size(max = 500, message = "Thumbnail URL must not exceed 500 characters")
    private String thumbnailUrl;

    private Set<Long> usersWithAccess;
    private UserDTO addedBy;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String youtubeChannelOwnerEmail;

    public YouTubeChannelDTO(YouTubeChannel channel) {
        this.id = channel.getId();
        this.channelName = channel.getChannelName();
        this.description = channel.getDescription();
        this.channelId = channel.getChannelId();
        this.channelUrl = channel.getChannelUrl();
        this.thumbnailUrl = channel.getThumbnailUrl();
        this.usersWithAccess = channel.getUsersWithAccess();
        this.addedBy = channel.getAddedBy() != null ? new UserDTO(channel.getAddedBy()) : null;
        this.isActive = channel.getIsActive();
        this.createdAt = channel.getCreatedAt();
        this.updatedAt = channel.getUpdatedAt();
        this.youtubeChannelOwnerEmail = channel.getYoutubeChannelOwnerEmail();
    }
}
