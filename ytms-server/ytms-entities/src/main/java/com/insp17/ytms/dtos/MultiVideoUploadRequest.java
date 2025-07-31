package com.insp17.ytms.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MultiVideoUploadRequest {
    @NotNull(message = "Task ID is required")
    private Long taskId;

    @NotNull(message = "At least one upload must be specified")
    private List<VideoUploadItem> uploads;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VideoUploadItem {
        @NotNull(message = "Revision ID is required")
        private Long revisionId;

        @NotNull(message = "Channel ID is required")
        private Long channelId;

        // Optional: Additional metadata specific to this upload
        private VideoMetadataDTO metadata;

        private String videoType; // "main" or "short"

        // Constructors for compatibility
        public VideoUploadItem(Long revisionId, Long channelId) {
            this.revisionId = revisionId;
            this.channelId = channelId;
        }
    }
}