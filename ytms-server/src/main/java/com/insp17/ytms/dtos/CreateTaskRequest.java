package com.insp17.ytms.dtos;

public class CreateTaskRequest {
    private String title;
    private String description;
    private String rawVideoUrl;
    private Long createdById;

    // Getters and setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRawVideoUrl() { return rawVideoUrl; }
    public void setRawVideoUrl(String rawVideoUrl) { this.rawVideoUrl = rawVideoUrl; }

    public Long getCreatedById() { return createdById; }
    public void setCreatedById(Long createdById) { this.createdById = createdById; }
}