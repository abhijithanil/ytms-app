package com.insp17.ytms.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.insp17.ytms.entity.PrivacyLevel;
import com.insp17.ytms.entity.TaskPriority;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@JsonDeserialize
public class CreateTaskRequest {
    private String title;
    private String description;
    private TaskPriority priority;
    private PrivacyLevel privacyLevel;
    private String deadline;
    private Long assignedEditorId;

    // Legacy single video support (backward compatibility)
    private String rawVideoUrl;
    private String rawVideoFilename;

    // NEW: Multiple raw videos support
    @JsonProperty("rawVideos")
    private List<RawVideoDto> rawVideos = new ArrayList<>();

    @JsonProperty("tags")
    private List<String> tags = new ArrayList<>();

    @JsonProperty("userIds")
    private List<Long> userIds = new ArrayList<>();

    @JsonProperty("comments")
    private List<String> comments = new ArrayList<>();

    @JsonProperty("audioInstructionUrls")
    private List<String> audioInstructionUrls = new ArrayList<>();

    @Override
    public String toString() {
        return "CreateTaskRequest{" +
                "title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", priority=" + priority +
                ", privacyLevel=" + privacyLevel +
                ", deadline='" + deadline + '\'' +
                ", assignedEditorId=" + assignedEditorId +
                ", rawVideoUrl='" + rawVideoUrl + '\'' +
                ", rawVideoFilename='" + rawVideoFilename + '\'' +
                ", rawVideos=" + rawVideos +
                ", tags=" + tags +
                ", userIds=" + userIds +
                ", comments=" + comments +
                ", audioInstructionUrls=" + audioInstructionUrls +
                '}';
    }
}