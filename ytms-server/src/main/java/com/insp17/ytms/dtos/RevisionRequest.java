package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.User;
import lombok.Data;

@Data
public class RevisionRequest {
    private Long videoTaskId;
    private String editedVideoUrl;
    private String editedVideoFilename;
    private String notes;
    private User uploadedBy;
    private String type; // main or short
}
