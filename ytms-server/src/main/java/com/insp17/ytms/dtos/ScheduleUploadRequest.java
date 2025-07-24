package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleUploadRequest {
    private Long videoTaskId;
    private List<Long> revisionIds;
    private LocalDateTime uploadTime;
}
