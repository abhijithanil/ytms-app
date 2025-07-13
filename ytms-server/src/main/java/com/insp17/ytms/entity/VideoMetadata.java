package com.insp17.ytms.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "video_metadata")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "video_task_id")
    private VideoTask videoTask;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection
    @CollectionTable(name = "video_tags", joinColumns = @JoinColumn(name = "video_metadata_id"))
    @Column(name = "tag")
    private Set<String> tags;

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

    @OneToMany(mappedBy = "videoMetadata", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<VideoChapter> videoChapters;


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

    public void clearChapters() {
        if (videoChapters != null) {
            videoChapters.forEach(chapter -> chapter.setVideoMetadata(null));
            videoChapters.clear();
        }
    }
}