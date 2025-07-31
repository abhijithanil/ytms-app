package com.insp17.ytms.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MultiChannelUploadRequest {
    @NotNull(message = "Video task ID is required")
    private Long videoId;

    @NotNull(message = "At least one channel must be specified")
    private List<Long> channelIds;

    private Boolean uploadToAllChannels = false;
}