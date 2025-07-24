package com.insp17.ytms.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "video_metadata")
@Getter
@Setter
@ToString(exclude = {"videoTask", "videoChapters", "revision", "rawVideo"})
@NoArgsConstructor
@AllArgsConstructor
public class VideoMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // UPDATED: Support for both task-level and specific video metadata
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_task_id")
    private VideoTask videoTask;

    // NEW: Link to specific revision (for revision-specific metadata)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revision_id")
    private Revision revision;

    // NEW: Link to specific raw video (for raw video-specific metadata)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raw_video_id")
    private RawVideo rawVideo;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @Column(name = "tag")
    private Set<String> tags = new HashSet<>();

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(nullable = false, length = 50)
    private String category = "Entertainment";

    @Column(nullable = false, length = 10)
    private String language = "en";

    @Column(name = "privacy_status", nullable = false, length = 20)
    private String privacyStatus = "public";

    @Column(name = "age_restriction")
    private Boolean ageRestriction = false;

    @Column(name = "made_for_kids")
    private Boolean madeForKids = false;

    @Column(name = "location_description")
    private String locationDescription;

    @Column(name = "recording_date")
    private LocalDate recordingDate;

    @Column(nullable = false)
    private String license = "YouTube Standard License";

    // NEW: YouTube Channel selection
    @Column(name = "youtube_channel_id")
    private String youtubeChannelId;

    @Column(name = "youtube_channel_name")
    private String youtubeChannelName;

    // NEW: Video type for shorts support
    @Enumerated(EnumType.STRING)
    @Column(name = "video_type")
    private VideoType videoType = VideoType.MAIN;

    // NEW: Shorts-specific metadata
    @Column(name = "is_short")
    private Boolean isShort = false;

    @Column(name = "short_hashtags")
    private String shortHashtags;

    @OneToMany(mappedBy = "videoMetadata", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<VideoChapter> videoChapters = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Convenience methods
    public void addChapter(VideoChapter chapter) {
        videoChapters.add(chapter);
        chapter.setVideoMetadata(this);
    }

    public void removeChapter(VideoChapter chapter) {
        videoChapters.remove(chapter);
        chapter.setVideoMetadata(null);
    }

    // Helper methods to determine what this metadata is for
    public boolean isForRevision() {
        return revision != null;
    }

    public boolean isForRawVideo() {
        return rawVideo != null;
    }

    public boolean isForTask() {
        return revision == null && rawVideo == null;
    }

    // Get the target identifier for this metadata
    public String getTargetIdentifier() {
        if (revision != null) {
            return "revision-" + revision.getId();
        }
        if (rawVideo != null) {
            return "rawvideo-" + rawVideo.getId();
        }
        return "task-" + videoTask.getId();
    }
}