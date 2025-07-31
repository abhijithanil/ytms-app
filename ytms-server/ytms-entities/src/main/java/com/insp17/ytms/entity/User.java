package com.insp17.ytms.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private UserStatus userStatus;

    private boolean mfaEnabled;

    @Column(columnDefinition = "TEXT")
    private String secret;

    @Column(name = "super_admin", nullable = false)
    private boolean superAdmin = false;

    private LocalDateTime lastLoginAt;

    private  LocalDateTime lastUpdateAt;

    // Constructors, getters, setters
    public User() {
    }

    public User(String firstName, String lastName, String username, String email, String password, UserRole role, UserStatus userStatus, boolean superAdmin) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = LocalDateTime.now();
        this.userStatus = userStatus;
        this.superAdmin = superAdmin;
    }

    public User(String firstName, String lastName, String username, String email, String password, UserRole role, UserStatus userStatus) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = LocalDateTime.now();
        this.userStatus = userStatus;
    }
}


// TaskPermission Entity

// Updated Revision Entity
