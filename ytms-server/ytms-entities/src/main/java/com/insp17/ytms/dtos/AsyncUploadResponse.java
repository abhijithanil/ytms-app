package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AsyncUploadResponse {
    private String uploadId;
    private String message;
    private String status;
}