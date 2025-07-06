package com.insp17.ytms.components;

import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.UserRepository;
import com.insp17.ytms.repository.VideoTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoTaskRepository videoTaskRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Create test users if they don't exist
        if (userRepository.count() == 0) {
            createTestUsers();
            createTestTasks();
        }
    }

    private void createTestUsers() {
        // Create admin user
        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("admin@example.com");
        admin.setPassword(passwordEncoder.encode("password123"));
        admin.setRole(UserRole.ADMIN);
        admin.setCreatedAt(LocalDateTime.now());
        userRepository.save(admin);

        // Create editor users
        User editor1 = new User();
        editor1.setUsername("editor1");
        editor1.setEmail("editor1@example.com");
        editor1.setPassword(passwordEncoder.encode("password123"));
        editor1.setRole(UserRole.EDITOR);
        editor1.setCreatedAt(LocalDateTime.now());
        userRepository.save(editor1);

        User editor2 = new User();
        editor2.setUsername("editor2");
        editor2.setEmail("editor2@example.com");
        editor2.setPassword(passwordEncoder.encode("password123"));
        editor2.setRole(UserRole.EDITOR);
        editor2.setCreatedAt(LocalDateTime.now());
        userRepository.save(editor2);

        // Create viewer user
        User viewer = new User();
        viewer.setUsername("viewer1");
        viewer.setEmail("viewer1@example.com");
        viewer.setPassword(passwordEncoder.encode("password123"));
        viewer.setRole(UserRole.VIEWER);
        viewer.setCreatedAt(LocalDateTime.now());
        userRepository.save(viewer);

        System.out.println("Test users created:");
        System.out.println("Admin: admin / password123");
        System.out.println("Editor1: editor1 / password123");
        System.out.println("Editor2: editor2 / password123");
        System.out.println("Viewer: viewer1 / password123");
    }

    private void createTestTasks() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        User editor1 = userRepository.findByUsername("editor1").orElse(null);
        User editor2 = userRepository.findByUsername("editor2").orElse(null);

        if (admin != null && editor1 != null && editor2 != null) {
            // Create test task 1
            VideoTask task1 = new VideoTask();
            task1.setTitle("Product Launch Video");
            task1.setDescription("Create a compelling product launch video showcasing our new features and benefits for the upcoming Q4 release.");
            task1.setCreatedBy(admin);
            task1.setAssignedEditor(editor1);
            task1.setTaskStatus(TaskStatus.IN_PROGRESS);
            task1.setTaskPriority(TaskPriority.HIGH);
            task1.setPrivacyLevel(PrivacyLevel.ALL);
            task1.setDeadline(LocalDateTime.now().plusDays(7));
            task1.setCreatedAt(LocalDateTime.now().minusDays(2));
            task1.setUpdatedAt(LocalDateTime.now().minusHours(6));
            videoTaskRepository.save(task1);

            // Create test task 2
            VideoTask task2 = new VideoTask();
            task2.setTitle("Customer Testimonial Compilation");
            task2.setDescription("Edit customer testimonials into a cohesive 2-minute video with background music and professional transitions.");
            task2.setCreatedBy(admin);
            task2.setAssignedEditor(editor2);
            task2.setTaskStatus(TaskStatus.REVIEW);
            task2.setTaskPriority(TaskPriority.MEDIUM);
            task2.setPrivacyLevel(PrivacyLevel.ALL);
            task2.setDeadline(LocalDateTime.now().plusDays(5));
            task2.setCreatedAt(LocalDateTime.now().minusDays(3));
            task2.setUpdatedAt(LocalDateTime.now().minusHours(12));
            videoTaskRepository.save(task2);

            // Create test task 3
            VideoTask task3 = new VideoTask();
            task3.setTitle("Tutorial Series Episode 3");
            task3.setDescription("Edit the third episode of our tutorial series with screen recordings and voice-over narration.");
            task3.setCreatedBy(admin);
            task3.setAssignedEditor(editor1);
            task3.setTaskStatus(TaskStatus.READY);
            task3.setTaskPriority(TaskPriority.MEDIUM);
            task3.setPrivacyLevel(PrivacyLevel.ALL);
            task3.setDeadline(LocalDateTime.now().plusDays(3));
            task3.setCreatedAt(LocalDateTime.now().minusDays(4));
            task3.setUpdatedAt(LocalDateTime.now().minusHours(2));
            videoTaskRepository.save(task3);

            // Create draft task
            VideoTask task4 = new VideoTask();
            task4.setTitle("Marketing Campaign Video");
            task4.setDescription("Create a marketing video for our summer campaign.");
            task4.setCreatedBy(admin);
            task4.setTaskStatus(TaskStatus.DRAFT);
            task4.setTaskPriority(TaskPriority.LOW);
            task4.setPrivacyLevel(PrivacyLevel.ALL);
            task4.setCreatedAt(LocalDateTime.now().minusHours(6));
            task4.setUpdatedAt(LocalDateTime.now().minusHours(6));
            videoTaskRepository.save(task4);

            System.out.println("Test tasks created successfully!");
        }
    }
}