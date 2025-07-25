package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UploadProgressDTO {
    private String uploadId;
    private String status; // "IN_PROGRESS", "COMPLETED", "FAILED"
    private String videoId; // YouTube video ID when completed
    private String message;
    private Double progressPercentage;
    private LocalDateTime startTime;
    private LocalDateTime completedTime;
    private String errorMessage;
}