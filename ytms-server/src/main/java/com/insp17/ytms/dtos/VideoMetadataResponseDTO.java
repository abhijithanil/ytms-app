package com.insp17.ytms.dtos;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoMetadataResponseDTO {
    private Long id;
    private String title;
    private String description;

    private Set<String> tags = new HashSet<>();

    @JsonProperty("thumbnail_url")
    private String thumbnailUrl;

    private String category;
    private String language;

    @JsonProperty("privacy_status")
    private String privacyStatus;

    @JsonProperty("age_restriction")
    private Boolean ageRestriction;

    @JsonProperty("made_for_kids")
    private Boolean madeForKids;

    @JsonProperty("recording_details")
    private VideoMetadataDTO.RecordingDetailsDTO recordingDetails;

    private String license;

    @JsonProperty("video_chapters")
    private List<VideoMetadataDTO.VideoChapterDTO> videoChapters;
}