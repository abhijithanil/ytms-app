package com.insp17.ytms.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateYouTubeChannelRequest {
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

    private List<Long> usersWithAccess;

    @NotBlank(message = "Youtube owner email is required")
    private String youtubeChannelOwnerEmail;
}
