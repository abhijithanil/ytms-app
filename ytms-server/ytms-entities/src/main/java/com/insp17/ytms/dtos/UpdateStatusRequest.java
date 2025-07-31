package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.TaskStatus;

public class UpdateStatusRequest {
    private TaskStatus status;

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }
}
