package com.insp17.ytms.dtos;

import java.time.LocalDateTime;

public class ScheduleUploadRequest {
    private LocalDateTime uploadTime;

    public LocalDateTime getUploadTime() { return uploadTime; }
    public void setUploadTime(LocalDateTime uploadTime) { this.uploadTime = uploadTime; }
}
