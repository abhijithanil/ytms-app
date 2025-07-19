package com.insp17.ytms.dtos;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateYouTubeChannelRequest {
    @Size(max = 100, message = "Channel name must not exceed 100 characters")
    private String channelName;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @Size(max = 500, message = "Channel URL must not exceed 500 characters")
    private String channelUrl;

    @Size(max = 500, message = "Thumbnail URL must not exceed 500 characters")
    private String thumbnailUrl;

    private List<Long> usersWithAccess;

    private Boolean isActive;
}