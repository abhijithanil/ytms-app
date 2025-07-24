package com.insp17.ytms.dtos;

import com.insp17.ytms.service.VideoTaskService;

public class VideoCountSummaryDTO {
    private long rawVideoCount;
    private long revisionCount;
    private long totalCount;

    public VideoCountSummaryDTO(VideoTaskService.VideoCountSummary summary) {
        this.rawVideoCount = summary.getRawVideoCount();
        this.revisionCount = summary.getRevisionCount();
        this.totalCount = summary.getTotalCount();
    }

    // Getters and setters
    public long getRawVideoCount() { return rawVideoCount; }
    public void setRawVideoCount(long rawVideoCount) { this.rawVideoCount = rawVideoCount; }
    public long getRevisionCount() { return revisionCount; }
    public void setRevisionCount(long revisionCount) { this.revisionCount = revisionCount; }
    public long getTotalCount() { return totalCount; }
    public void setTotalCount(long totalCount) { this.totalCount = totalCount; }
}
