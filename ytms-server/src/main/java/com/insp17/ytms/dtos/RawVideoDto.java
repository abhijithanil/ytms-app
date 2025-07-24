package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.RawVideo;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class RawVideoDto {
    private Long id;
    private String videoUrl;
    private String filename;
    private Long fileSize;
    private Integer videoOrder;
    private String description;
    private UserDTO uploadedBy;
    private LocalDateTime createdAt;
    private Integer order;

    public RawVideoDto(String videoUrl, String filename, Long fileSize, String description, Integer order) {
        this.videoUrl = videoUrl;
        this.filename = filename;
        this.fileSize = fileSize;
        this.description = description;
        this.order = order;
    }

    public RawVideoDto(RawVideo rawVideo) {
        this.id = rawVideo.getId();
        this.videoUrl = rawVideo.getVideoUrl();
        this.filename = rawVideo.getFilename();
        this.fileSize = rawVideo.getFileSize();
        this.videoOrder = rawVideo.getVideoOrder();
        this.description = rawVideo.getDescription();
        this.uploadedBy = rawVideo.getUploadedBy() != null ? new UserDTO(rawVideo.getUploadedBy()) : null;
        this.createdAt = rawVideo.getCreatedAt();
    }
}
