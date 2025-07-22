package com.insp17.ytms.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoMetadataDTO {

    @NotBlank(message = "Title is required")
    @Size(max = 100, message = "Title must not exceed 100 characters")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private Set<String> tags;

    @JsonProperty("thumbnail_url")
    private String thumbnailUrl;

    private String category;

    private String language;

    @JsonProperty("privacy_status")
    private String privacyStatus;

    @JsonProperty("age_restriction")
    private Boolean ageRestriction = false;

    @JsonProperty("made_for_kids")
    private Boolean madeForKids = false;

    @JsonProperty("recording_details")
    private RecordingDetailsDTO recordingDetails;

    private String license;

    @JsonProperty("video_chapters")
    private List<VideoChapterDTO> videoChapters;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecordingDetailsDTO {
        @JsonProperty("location_description")
        private String locationDescription;

        @JsonProperty("recording_date")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        private LocalDate recordingDate;
    }

}
