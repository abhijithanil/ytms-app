package com.insp17.ytms.dtos;

import com.insp17.ytms.service.VideoTaskService;

import java.util.List;
import java.util.stream.Collectors;

public class TaskVideosInfoDTO {
    private VideoTaskDTO task;
    private List<RawVideoDto> rawVideos;
    private List<RevisionDTO> revisions;
    private boolean hasLegacyRawVideo;
    private int totalVideoCount;

    public TaskVideosInfoDTO(VideoTaskService.TaskVideosInfo videosInfo) {
        this.task = new VideoTaskDTO(videosInfo.getTask());
        this.rawVideos = videosInfo.getRawVideos().stream()
                .map(RawVideoDto::new)
                .collect(Collectors.toList());
        this.revisions = videosInfo.getRevisions().stream()
                .map(RevisionDTO::new)
                .collect(Collectors.toList());
        this.hasLegacyRawVideo = videosInfo.hasLegacyRawVideo();
        this.totalVideoCount = videosInfo.getTotalVideoCount();
    }

    // Getters and setters
    public VideoTaskDTO getTask() {
        return task;
    }

    public void setTask(VideoTaskDTO task) {
        this.task = task;
    }

    public List<RawVideoDto> getRawVideos() {
        return rawVideos;
    }

    public void setRawVideos(List<RawVideoDto> rawVideos) {
        this.rawVideos = rawVideos;
    }

    public List<RevisionDTO> getRevisions() {
        return revisions;
    }

    public void setRevisions(List<RevisionDTO> revisions) {
        this.revisions = revisions;
    }

    public boolean isHasLegacyRawVideo() {
        return hasLegacyRawVideo;
    }

    public void setHasLegacyRawVideo(boolean hasLegacyRawVideo) {
        this.hasLegacyRawVideo = hasLegacyRawVideo;
    }

    public int getTotalVideoCount() {
        return totalVideoCount;
    }

    public void setTotalVideoCount(int totalVideoCount) {
        this.totalVideoCount = totalVideoCount;
    }
}
