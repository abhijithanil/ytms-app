package com.insp17.ytms.service;

import com.insp17.ytms.dtos.TaskStatusCount;
import com.insp17.ytms.entity.TaskStatus;
import com.insp17.ytms.repository.VideoTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TaskSupportService {
    private static final List<TaskStatus> ACTIVE_STATUS = List.of(TaskStatus.DRAFT, TaskStatus.ASSIGNED,
            TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.READY, TaskStatus.SCHEDULED, TaskStatus.UPLOADING);

    private static final List<TaskStatus> COMPLETED_STATUS = List.of(TaskStatus.COMPLETED, TaskStatus.UPLOADED);


    @Autowired
    private VideoTaskRepository videoTaskRepository;

    public Map<String, Integer> getTaskCounts() {
        List<TaskStatusCount> taskStatusCounts = videoTaskRepository.countTasksByStatus();
        Map<String, Integer> taskStatusCountsMap = new HashMap<>();
        int activeCount = 0;
        int completedCount = 0;
        int totalCount = taskStatusCounts.size();
        for (TaskStatusCount taskStatusCount : taskStatusCounts) {
            TaskStatus status = taskStatusCount.getStatus();
            if (ACTIVE_STATUS.contains(status)) {
                activeCount += 1;
            } else if (COMPLETED_STATUS.contains(status)) {
                completedCount += 1;
            }
            taskStatusCountsMap.put("activeTask", activeCount);
            taskStatusCountsMap.put("completedTask", completedCount);
            taskStatusCountsMap.put("totalTask", totalCount);
        }
        return taskStatusCountsMap;
    }

    public Map<String, Integer> getTaskCountsByUserId(long assignedUserId) {
        List<TaskStatusCount> taskStatusCounts = videoTaskRepository.countTasksByStatusByUserId(assignedUserId);
        Map<String, Integer> taskStatusCountsMap = new HashMap<>();
        int activeCount = 0;
        int completedCount = 0;
        int totalCount = taskStatusCounts.size();
        for (TaskStatusCount taskStatusCount : taskStatusCounts) {
            TaskStatus status = taskStatusCount.getStatus();
            if (ACTIVE_STATUS.contains(status)) {
                activeCount += 1;
            } else if (COMPLETED_STATUS.contains(status)) {
                completedCount += 1;
            }
            taskStatusCountsMap.put("activeTask", activeCount);
            taskStatusCountsMap.put("completedTask", completedCount);
            taskStatusCountsMap.put("totalTask", totalCount);
        }
        return taskStatusCountsMap;
    }
}
