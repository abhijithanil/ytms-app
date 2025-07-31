package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.PrivacyLevel;
import com.insp17.ytms.entity.TaskPriority;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskUpdateRequest {
    private String title;
    private String description;
    private TaskPriority priority;
    private PrivacyLevel privacyLevel;
    private String assignedEditorId;
    private String deadline;
}
