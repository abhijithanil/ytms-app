package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UploadStatusResponse {
    private String uploadId;
    private boolean status; // true if completed, false if in progress or failed
    private String videoId;
    private String message;
    private Double progressPercentage;
    private String uploadStatus; // "IN_PROGRESS", "COMPLETED", "FAILED"
}