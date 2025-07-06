package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.dtos.VideoTaskDTO;
import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.service.VideoTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    @Autowired
    private VideoTaskService videoTaskService;

    @GetMapping("/stats")
    public ResponseEntity<VideoTaskService.DashboardStats> getDashboardStats(@CurrentUser UserPrincipal userPrincipal) {
        VideoTaskService.DashboardStats stats = videoTaskService.getDashboardStats(userPrincipal.getId());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/recent-tasks")
    public ResponseEntity<List<VideoTaskDTO>> getRecentTasks(@CurrentUser UserPrincipal userPrincipal) {
        List<VideoTask> recentTasks = videoTaskService.getRecentTasks(userPrincipal.getId());
        List<VideoTaskDTO> taskDTOs = recentTasks.stream()
                .map(VideoTaskDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }
}