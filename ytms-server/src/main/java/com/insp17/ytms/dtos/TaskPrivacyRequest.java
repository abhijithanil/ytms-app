package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.PrivacyLevel;

import java.util.List;

public class TaskPrivacyRequest {
    private PrivacyLevel privacyLevel;
    private List<Long> userIds;

    public PrivacyLevel getPrivacyLevel() {
        return privacyLevel;
    }

    public void setPrivacyLevel(PrivacyLevel privacyLevel) {
        this.privacyLevel = privacyLevel;
    }

    public List<Long> getUserIds() {
        return userIds;
    }

    public void setUserIds(List<Long> userIds) {
        this.userIds = userIds;
    }
}