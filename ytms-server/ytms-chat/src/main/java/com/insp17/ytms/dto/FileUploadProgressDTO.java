package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadProgressDTO {
    private String uploadId;
    private String fileName;
    private Long fileSize;
    private Long bytesUploaded;
    private Double progressPercentage;
    private String status; // UPLOADING, COMPLETED, FAILED, CANCELLED
    private String errorMessage;
}
