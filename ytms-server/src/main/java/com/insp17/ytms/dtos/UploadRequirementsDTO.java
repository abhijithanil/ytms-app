package com.insp17.ytms.dtos;

import java.util.ArrayList;
import java.util.List;

public class UploadRequirementsDTO {
    private List<VideoRequirementStatus> videoRequirements = new ArrayList<>();
    private boolean allRequirementsMet;

    public void addVideoRequirement(VideoRequirementStatus status) {
        videoRequirements.add(status);
        updateAllRequirementsMet();
    }

    private void updateAllRequirementsMet() {
        allRequirementsMet = videoRequirements.stream()
                .allMatch(VideoRequirementStatus::isHasMetadata);
    }

    // Getters and setters
    public List<VideoRequirementStatus> getVideoRequirements() {
        return videoRequirements;
    }

    public void setVideoRequirements(List<VideoRequirementStatus> videoRequirements) {
        this.videoRequirements = videoRequirements;
        updateAllRequirementsMet();
    }

    public boolean isAllRequirementsMet() {
        return allRequirementsMet;
    }

    public void setAllRequirementsMet(boolean allRequirementsMet) {
        this.allRequirementsMet = allRequirementsMet;
    }
}
