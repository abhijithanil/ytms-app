package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.Revision;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevisionDTO {
    private Long id;
    private Long videoTaskId;
    private Integer revisionNumber;
    private String editedVideoUrl;
    private String editedVideoFilename;
    private String notes;
    private UserDTO uploadedBy;
    private LocalDateTime createdAt;
    private String type; // "main" or "short"
//    private Long fileSize; // File size in bytes


    public RevisionDTO(Revision revision) {
        this.id = revision.getId();
        this.videoTaskId = revision.getVideoTask().getId();
        this.revisionNumber = revision.getRevisionNumber();
        this.editedVideoUrl = revision.getEditedVideoUrl();
        this.editedVideoFilename = revision.getEditedVideoFilename();
        this.notes = revision.getNotes();
        this.uploadedBy = revision.getUploadedBy() != null ? new UserDTO(revision.getUploadedBy()) : null;
        this.createdAt = revision.getCreatedAt();
        this.type = revision.getType() != null ? revision.getType() : "main"; // Default to main if null
//        this.fileSize = revision.getFileSize();
    }

}