package com.insp17.ytms.dtos;

public class VideoRequirementStatus {
    private String videoIdentifier;
    private boolean hasMetadata;
    private String metadataError;

    // Getters and setters
    public String getVideoIdentifier() {
        return videoIdentifier;
    }

    public void setVideoIdentifier(String videoIdentifier) {
        this.videoIdentifier = videoIdentifier;
    }

    public boolean isHasMetadata() {
        return hasMetadata;
    }

    public void setHasMetadata(boolean hasMetadata) {
        this.hasMetadata = hasMetadata;
    }

    public String getMetadataError() {
        return metadataError;
    }

    public void setMetadataError(String metadataError) {
        this.metadataError = metadataError;
    }
}
