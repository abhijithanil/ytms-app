package com.insp17.ytms.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentUploadResponse {
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
    private String uploadId;
}