package com.insp17.ytms.dtos;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;

import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private String username;
    private String password; // Should be excluded in responses
    private String email;
    private UserRole role;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastLoginAt;

    // Chat-specific fields
    private String displayName;
    private String initials;
    private String avatarUrl;
    private String status; // online, away, busy, offline
    private Boolean isOnline;
    private Boolean active;

    public UserDTO() {
    }

    public UserDTO(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
        this.lastLoginAt = user.getLastLoginAt();
        this.active = user.getUserStatus() != null && user.getUserStatus().name().equals("ACTIVE");

        // Generate display name and initials for chat
        this.displayName = generateDisplayName();
        this.initials = generateInitials();
        this.status = "offline"; // Default status
        this.isOnline = false;

        // Don't include password in DTO
        this.password = null;
    }

    /**
     * Create UserDTO for chat responses (excludes sensitive data)
     */
    public static UserDTO forChatResponse(User user) {
        UserDTO dto = new UserDTO(user);
        dto.setPassword(null); // Ensure password is never included
        return dto;
    }

    /**
     * Generate display name from first/last name or username
     */
    private String generateDisplayName() {
        if (firstName != null && !firstName.trim().isEmpty()) {
            if (lastName != null && !lastName.trim().isEmpty()) {
                return firstName + " " + lastName;
            }
            return firstName;
        }
        return username;
    }

    /**
     * Generate initials for avatar
     */
    private String generateInitials() {
        if (firstName != null && lastName != null &&
                !firstName.trim().isEmpty() && !lastName.trim().isEmpty()) {
            return (firstName.charAt(0) + "" + lastName.charAt(0)).toUpperCase();
        }

        String name = displayName != null ? displayName : username;
        if (name != null && !name.isEmpty()) {
            if (name.contains(" ")) {
                String[] parts = name.split("\\s+");
                if (parts.length >= 2) {
                    return (parts[0].charAt(0) + "" + parts[parts.length - 1].charAt(0)).toUpperCase();
                }
            }
            return name.substring(0, 1).toUpperCase();
        }

        return "?";
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getInitials() {
        return initials;
    }

    public void setInitials(String initials) {
        this.initials = initials;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getIsOnline() {
        return isOnline;
    }

    public void setIsOnline(Boolean isOnline) {
        this.isOnline = isOnline;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}