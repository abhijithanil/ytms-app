package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Getter
@Setter
public class TaskStatusCount {
    private TaskStatus status;
    private long count;
}