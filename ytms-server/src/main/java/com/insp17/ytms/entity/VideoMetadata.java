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
// CHANGE: Replaced @Data with more specific and safer annotations for entities.
@Getter
@Setter
@ToString(exclude = {"videoTask", "videoChapters"}) // Exclude collections and relationships from toString
@NoArgsConstructor
@AllArgsConstructor
public class VideoMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // NOTE: videoTask is often just an ID link, LAZY fetching is more appropriate.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_task_id")
    private VideoTask videoTask;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // NOTE: @ElementCollection is the standard JPA way to store a collection of basic types like String.
    @ElementCollection(fetch = FetchType.EAGER) // EAGER is often fine for a small set of strings
    @CollectionTable(name = "video_metadata_tags", joinColumns = @JoinColumn(name = "metadata_id"))
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

    // CHANGE: Switched to LAZY fetching for performance.
    @OneToMany(mappedBy = "videoMetadata", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<VideoChapter> videoChapters = new ArrayList<>();


    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Convenience methods remain the same, very useful!
    public void addChapter(VideoChapter chapter) {
        videoChapters.add(chapter);
        chapter.setVideoMetadata(this);
    }

    public void removeChapter(VideoChapter chapter) {
        videoChapters.remove(chapter);
        chapter.setVideoMetadata(null);
    }
}