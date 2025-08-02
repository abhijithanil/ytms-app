package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {

    @Autowired
    private UserService userService;

    // Helper method to extract UserPrincipal from Principal
    private UserPrincipal getUserPrincipalFromPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken) {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            if (auth.getPrincipal() instanceof UserPrincipal) {
                return (UserPrincipal) auth.getPrincipal();
            }
        }
        return null;
    }

    //  EXISTING ADMIN ENDPOINTS (Modified paths to avoid conflicts) 

    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsersForAdmin() {
        log.debug("Admin request to get all users");
        return ResponseEntity.ok(userService.getAllUsers(UserRole.ADMIN));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserByIdForAdmin(@PathVariable Long id) {
        log.debug("Admin request to get user by ID: {}", id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        log.debug("Admin request to get user by username: {}", username);
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest request) {
        log.info("Admin creating new user: {}", request.getUsername());

        User user = new User(
                request.getFirstName(),
                request.getLastName(),
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getRole(),
                request.getUserStatus()
        );

        UserResponse createdUser = userService.createUser(user);
        return ResponseEntity.ok(createdUser);
    }

    @GetMapping("/editors")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getEditors() {
        log.debug("Admin request to get all editors");
        return ResponseEntity.ok(userService.getEditors());
    }

    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAdmins() {
        log.debug("Admin request to get all admins");
        return ResponseEntity.ok(userService.getAdmins());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest updateUserRequest) {
        log.info("Admin updating user: {}", id);

        User userDetails = userService.getUserByIdPrivateUse(id);

        if (userDetails == null) {
            log.warn("User not found for update: {}", id);
            return ResponseEntity.notFound().build();
        }

        // Check if the user is a super admin
        if (userDetails.isSuperAdmin()) {
            log.warn("Attempt to update super admin user: {}", id);
            return ResponseEntity.status(403).body(new UserResponse(userDetails));
        }

        if (updateUserRequest.getUsername() != null) {
            userDetails.setUsername(updateUserRequest.getUsername());
        }

        if (updateUserRequest.getEmail() != null) {
            userDetails.setEmail(updateUserRequest.getEmail());
        }

        if (updateUserRequest.getRole() != null) {
            userDetails.setRole(updateUserRequest.getRole());
        }

        if (updateUserRequest.getUserStatus() != null) {
            userDetails.setUserStatus(updateUserRequest.getUserStatus());
        }

        if (updateUserRequest.getFirstName() != null) {
            userDetails.setFirstName(updateUserRequest.getFirstName());
        }

        if (updateUserRequest.getLastName() != null) {
            userDetails.setLastName(updateUserRequest.getLastName());
        }

        UserResponse updatedUser = userService.updateUser(userDetails);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/profile")
    @PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUserProfile(@PathVariable Long id, @RequestBody UpdateProfileRequest request) {
        log.info("User profile update request for user: {}", id);
        UserResponse updatedUser = userService.updateUserProfile(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("#id == authentication.principal.id")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody UpdatePasswordRequest request) {
        log.info("Password change request for user: {}", id);
        userService.changePassword(id, request);
        return ResponseEntity.ok(new ApiResponse(true, "Password changed successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Admin deleting user: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanently")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUserPermanently(@PathVariable Long id) {
        log.warn("Admin permanently deleting user: {}", id);
        userService.permanentlyDeleteUser(id);
        return ResponseEntity.noContent().build();
    }

    //  NEW CHAT-RELATED ENDPOINTS 

    /**
     * Get all users for chat functionality (creating DMs, adding to groups)
     * This replaces the original @GetMapping without path
     */
    @GetMapping("/chat/all")
    public ResponseEntity<List<UserDTO>> getAllUsersForChat(Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                log.warn("Unauthorized request to get all users for chat");
                return ResponseEntity.status(401).build();
            }

            log.debug("Fetching all users for chat by user: {}", userPrincipal.getUsername());
            List<UserDTO> users = userService.getAllUsersAsDTO();

            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error fetching all users for chat: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Alternative endpoint that matches frontend expectations
     */
    @GetMapping("/all")
    public ResponseEntity<List<UserDTO>> getAllUsers(Principal principal) {
        return getAllUsersForChat(principal);
    }

    /**
     * Search users by query for chat functionality
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
            @RequestParam String q,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                log.warn("Unauthorized request to search users");
                return ResponseEntity.status(401).build();
            }

            log.debug("Searching users with query: '{}' by user: {}", q, userPrincipal.getUsername());
            List<UserDTO> users = userService.searchUsersAsDTO(q);

            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error searching users with query '{}': {}", q, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Get user by ID for chat functionality
     */
    @GetMapping("/chat/{userId}")
    public ResponseEntity<UserDTO> getUserByIdForChat(
            @PathVariable Long userId,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                log.warn("Unauthorized request to get user by ID for chat");
                return ResponseEntity.status(401).build();
            }

            log.debug("Fetching user {} for chat by user: {}", userId, userPrincipal.getUsername());
            UserDTO user = userService.getUserByIdAsDTO(userId);

            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            log.warn("User {} not found for chat", userId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching user {} for chat: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }


    /**
     * Update user status for chat presence
     */
    @PatchMapping("/me/status")
    public ResponseEntity<Void> updateUserStatus(
            @RequestBody UpdateUserStatusRequest request,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                log.warn("Unauthorized request to update user status");
                return ResponseEntity.status(401).build();
            }

            log.debug("Updating status to '{}' for user: {}", request.getStatus(), userPrincipal.getUsername());

            userService.updateUserStatus(userPrincipal.getId(), request.getStatus());

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error updating user status: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Get user profile by ID (public endpoint for viewing other users)
     */
    @GetMapping("/profile/{userId}")
    public ResponseEntity<UserDTO> getUserProfile(
            @PathVariable Long userId,
            Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                log.warn("Unauthorized request to get user profile");
                return ResponseEntity.status(401).build();
            }

            log.debug("Fetching user profile {} by user: {}", userId, userPrincipal.getUsername());
            UserDTO user = userService.getUserByIdAsDTO(userId);

            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            log.warn("User profile {} not found", userId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching user profile {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Check if email exists (for validation)
     */
    @GetMapping("/check/email/{email}")
    public ResponseEntity<Boolean> checkEmailExists(@PathVariable String email) {
        try {
            boolean exists = userService.existsByEmail(email);
            return ResponseEntity.ok(exists);
        } catch (Exception e) {
            log.error("Error checking email existence: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    // INNER CLASSES FOR REQUEST/RESPONSE 

    /**
     * Request class for updating user status
     */
    public static class UpdateUserStatusRequest {
        private String status;

        public UpdateUserStatusRequest() {
        }

        public UpdateUserStatusRequest(String status) {
            this.status = status;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

//    /**
//     * Get all users for chat purposes (add this endpoint)
//     */
//    @GetMapping("/all")
//    public ResponseEntity<List<Map<String, Object>>> getAllUsersForChat() {
//        try {
//            List<User> users = userService.getAllUsersForChat();
//            List<Map<String, Object>> userDTOs = users.stream()
//                    .map(this::convertUserToChatDTO)
//                    .collect(Collectors.toList());
//
//            return ResponseEntity.ok(userDTOs);
//        } catch (Exception e) {
//            log.error("Error fetching all users for chat: {}", e.getMessage());
//            return ResponseEntity.status(500).build();
//        }
//    }

    /**
     * Get current user profile for chat (add this endpoint if not already present)
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUserProfile(Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal == null) {
                return ResponseEntity.status(401).build();
            }

            User user = userService.getUserForChat(userPrincipal.getId());
            if (user != null) {
                return ResponseEntity.ok(convertUserToChatDTO(user));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error getting current user profile: {}", e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }


    /**
     * Check if username exists (add this endpoint)
     */
    @GetMapping("/check/username/{username}")
    public ResponseEntity<Map<String, Boolean>> checkUsernameExists(@PathVariable String username) {
        try {
            boolean exists = userService.existsByUsername(username);
            Map<String, Boolean> response = new HashMap<>();
            response.put("exists", exists);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error checking username {}: {}", username, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Convert User entity to DTO for chat frontend (add this helper method)
     */
    private Map<String, Object> convertUserToChatDTO(User user) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", user.getId());
        dto.put("username", user.getUsername());
        dto.put("email", user.getEmail());
        dto.put("firstName", user.getFirstName());
        dto.put("lastName", user.getLastName());
        dto.put("displayName", userService.getDisplayName(user));
        dto.put("role", user.getRole());
        dto.put("active", user.getUserStatus());
        dto.put("createdAt", user.getCreatedAt());
        dto.put("updatedAt", user.getLastUpdateAt());

        // Add any additional fields needed for chat
        return dto;
    }
}