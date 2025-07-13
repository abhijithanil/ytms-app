package com.insp17.ytms.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "video_chapters")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoChapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 10)
    private String timestamp;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "video_metadata_id", nullable = false)
    @JsonBackReference
    private VideoMetadata videoMetadata;

    @Column(name = "chapter_order")
    private Integer order;

    public VideoChapter(String title, String timestamp) {
        this.title = title;
        this.timestamp = timestamp;
    }
}