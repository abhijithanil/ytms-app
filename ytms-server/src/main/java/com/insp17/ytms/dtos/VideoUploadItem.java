package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class VideoUploadItem {
    private Long revisionId;
    private Long rawVideoId;
    private Long channelId;
    private String videoType; // "revision" or "raw"
    private Map<String, Object> metadata; // Video-specific metadata
    private boolean hasMetadata;
    private Long videoId; // revision ID or raw video ID (null for legacy)
    private String videoIdentifier;


    public String getVideoIdentifier() {
        if ("revision".equals(videoType) && revisionId != null) {
            return "revision-" + revisionId;
        } else if ("raw".equals(videoType) && rawVideoId != null) {
            return "raw-" + rawVideoId;
        }
        return "unknown";
    }
}


