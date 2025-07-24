package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CheckRequirementsRequest {
    private List<String> videoIdentifiers;

    // Getters and setters
    public List<String> getVideoIdentifiers() {
        return videoIdentifiers;
    }

    public void setVideoIdentifiers(List<String> videoIdentifiers) {
        this.videoIdentifiers = videoIdentifiers;
    }
}
