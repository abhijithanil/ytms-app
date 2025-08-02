package com.insp17.ytms.service;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.*;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoTaskRepository videoTaskRepository;

    @Autowired
    private AudioInstructionRepository audioInstructionRepository;

    @Autowired
    private RevisionRepository revisionRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private TaskPermissionRepository taskPermissionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TaskSupportService taskSupportService;

    @Autowired
    private YouTubeChannelRepository youTubeChannelRepository;

    //  EXISTING METHODS 

    public List<UserResponse> getAllUsers(UserRole userRole) {
        if (userRole == null) {
            throw new IllegalArgumentException("User role cannot be null");
        }
        List<User> users;

        if (userRole == UserRole.ADMIN) {
            users = userRepository.findAll();
        } else {
            users = userRepository.findAllActiveUsers();
        }

        List<UserResponse> userResponses = users.stream().map(UserResponse::new).toList();
        for (UserResponse user : userResponses) {
            user.setVideoTaskCounts(taskSupportService.getTaskCountsByUserId(user.getId()));
        }
        return userResponses;
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new UserResponse(user);
    }

    public User getUserByIdPrivateUse(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user;
    }

    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new UserResponse(user);
    }

    public User getUserByUsernameEntity(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public UserResponse createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User result = userRepository.save(user);
        return new UserResponse(result);
    }

    public List<UserResponse> getEditors() {
        List<User> editors = userRepository.findByRoleAndUserStatus(UserRole.EDITOR, UserStatus.ACTIVE);
        return editors.stream().map(UserResponse::new).collect(Collectors.toList());
    }

    public List<UserResponse> getAdmins() {
        List<User> users = userRepository.findByRole(UserRole.ADMIN);
        return users.stream().map(UserResponse::new).collect(Collectors.toList());
    }

    public UserResponse updateUser(User userDetails) {
        User user = userRepository.save(userDetails);
        return new UserResponse(user);
    }

    /**
     * Update user with role and status changes
     */
    public UserResponse updateUser(Long userId, UpdateUserRequest updateRequest) {
        User user = getUserByIdPrivateUse(userId);

        // Update role if provided
        if (updateRequest.getRole() != null) {
            user.setRole(updateRequest.getRole());
        }

        // Update status if provided
        if (updateRequest.getUserStatus() != null) {
            user.setUserStatus(updateRequest.getUserStatus());
        }

        // Update other fields if provided
        if (updateRequest.getFirstName() != null) {
            user.setFirstName(updateRequest.getFirstName().trim());
        }

        if (updateRequest.getLastName() != null) {
            user.setLastName(updateRequest.getLastName().trim());
        }

        if (updateRequest.getUsername() != null) {
            user.setUsername(updateRequest.getUsername().trim());
        }

        if (updateRequest.getEmail() != null) {
            user.setEmail(updateRequest.getEmail().trim());
        }

        User savedUser = userRepository.save(user);
        return new UserResponse(savedUser);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User does not exists"));
        user.setUserStatus(UserStatus.SUSPENDED);
    }

    @Transactional
    public void permanentlyDeleteUser(Long userId) {
        User userToDelete = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Only allow deletion of suspended users
        if (userToDelete.getUserStatus() != UserStatus.SUSPENDED) {
            throw new RuntimeException("Only suspended users can be permanently deleted");
        }

        // Prevent deletion of super admin
        if (userToDelete.isSuperAdmin()) {
            throw new RuntimeException("Cannot delete super admin user");
        }

        // Get the super admin to reassign entities
        User superAdmin = userRepository.findByRole(UserRole.ADMIN)
                .stream()
                .filter(User::isSuperAdmin)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Super admin not found"));

        // Reassign all entities to super admin
        reassignUserEntities(userToDelete, superAdmin);

        // Finally delete the user
        userRepository.delete(userToDelete);
    }

    @Transactional
    protected void reassignUserEntities(User userToDelete, User superAdmin) {
        // Reassign VideoTasks created by the user
        List<VideoTask> createdTasks = videoTaskRepository.findByCreatedBy(userToDelete);
        for (VideoTask task : createdTasks) {
            task.setCreatedBy(superAdmin);
            videoTaskRepository.save(task);
        }

        // Reassign VideoTasks assigned to the user
        List<VideoTask> assignedTasks = videoTaskRepository.findByAssignedEditor(userToDelete);
        for (VideoTask task : assignedTasks) {
            task.setAssignedEditor(superAdmin);
            videoTaskRepository.save(task);
        }

        // Reassign Comments
        List<Comment> comments = commentRepository.findByAuthor(userToDelete);
        for (Comment comment : comments) {
            comment.setAuthor(superAdmin);
            commentRepository.save(comment);
        }

        // Reassign Revisions
        List<Revision> revisions = revisionRepository.findByUploadedBy(userToDelete);
        for (Revision revision : revisions) {
            revision.setUploadedBy(superAdmin);
            revisionRepository.save(revision);
        }

        // Reassign AudioInstructions
        List<AudioInstruction> audioInstructions = audioInstructionRepository.findByUploadedBy(userToDelete);
        for (AudioInstruction instruction : audioInstructions) {
            instruction.setUploadedBy(superAdmin);
            audioInstructionRepository.save(instruction);
        }

        // Reassign YouTube Channels
        List<YouTubeChannel> channels = youTubeChannelRepository.findByAddedBy(userToDelete);
        for (YouTubeChannel channel : channels) {
            channel.setAddedBy(superAdmin);
            // Remove user from access list if present
            channel.removeUserAccess(userToDelete.getId());
            youTubeChannelRepository.save(channel);
        }

        // Remove TaskPermissions for this user
        List<TaskPermission> permissions = taskPermissionRepository.findByUser(userToDelete);
        taskPermissionRepository.deleteAll(permissions);
    }

    public UserResponse getMainAdmin() {
        User user = userRepository.findFirstByRoleOrderByIdAsc(UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("No admin user found to reassign tasks to."));
        return new UserResponse(user);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public UserResponse updateUserProfile(Long id, UpdateProfileRequest request) {
        User user = getUserByIdPrivateUse(id);
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        return new UserResponse(user);
    }

    public void changePassword(Long id, UpdatePasswordRequest request) {
        User user = getUserByIdPrivateUse(id);
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Incorrect current password");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public boolean hasAnyUsers() {
        return userRepository.count() > 0;
    }

    public UserPrincipal getUserPrincipal(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return UserPrincipal.create(user);
    }

    //  NEW CHAT-RELATED METHODS 

    /**
     * Get all active users for chat functionality (creating DMs, adding to groups)
     */
    public List<User> getAllUsers() {
        log.debug("Fetching all active users for chat");
        return userRepository.findAllActiveUsers();
    }

    /**
     * Get all users as UserDTO for chat API responses
     */
    public List<UserDTO> getAllUsersAsDTO() {
        log.debug("Fetching all active users as DTO for chat");
        List<User> users = userRepository.findAllActiveUsers();
        return users.stream()
                .map(UserDTO::forChatResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search users by query (username, email, first name, last name)
     */
    public List<User> searchUsers(String query) {
        log.debug("Searching users with query: '{}'", query);

        if (query == null || query.trim().isEmpty()) {
            return getAllUsers();
        }

        String searchTerm = query.trim().toLowerCase();

        return userRepository.findAllActiveUsers().stream()
                .filter(user -> (
                        (user.getUsername() != null && user.getUsername().toLowerCase().contains(searchTerm)) ||
                                (user.getEmail() != null && user.getEmail().toLowerCase().contains(searchTerm)) ||
                                (user.getFirstName() != null && user.getFirstName().toLowerCase().contains(searchTerm)) ||
                                (user.getLastName() != null && user.getLastName().toLowerCase().contains(searchTerm))
                ))
                .collect(Collectors.toList());
    }

    /**
     * Search users as UserDTO for chat API responses
     */
    public List<UserDTO> searchUsersAsDTO(String query) {
        log.debug("Searching users as DTO with query: '{}'", query);
        List<User> users = searchUsers(query);
        return users.stream()
                .map(UserDTO::forChatResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get user by ID as UserDTO for chat API responses
     */
    public UserDTO getUserByIdAsDTO(Long id) {
        log.debug("Fetching user {} as DTO", id);
        User user = getUserByIdPrivateUse(id);
        return UserDTO.forChatResponse(user);
    }

    /**
     * Get current user as UserDTO for chat API responses
     */
    public UserDTO getCurrentUserAsDTO(Long userId) {
        log.debug("Fetching current user {} as DTO", userId);
        User user = getUserByIdPrivateUse(userId);
        return UserDTO.forChatResponse(user);
    }

    /**
     * Check if user can access task (for chat permissions)
     */
    public boolean canUserAccessTask(Long taskId, User user) {
        try {
            // This assumes you have a method to check task access
            // You might need to implement this based on your task permission system
            VideoTask task = videoTaskRepository.findById(taskId).orElse(null);
            if (task == null) return false;

            // Check if user is admin, task creator, or assigned editor
            return user.getRole() == UserRole.ADMIN ||
                    task.getCreatedBy().getId().equals(user.getId()) ||
                    (task.getAssignedEditor() != null && task.getAssignedEditor().getId().equals(user.getId()));
        } catch (Exception e) {
            log.error("Error checking task access for user {} and task {}: {}", user.getId(), taskId, e.getMessage());
            return false;
        }
    }

    /**
     * Update user online status (for chat presence)
     * This is handled in-memory by ChatService, but you could persist it if needed
     */
    public void updateUserStatus(Long userId, String status) {
        log.debug("Status update request for user {} to status: {}", userId, status);
        // Currently handled in-memory by ChatService
        // You can implement persistent status storage here if needed
    }


    /**
     * Get all users with chat-friendly information
     *
     * @return List of users with basic chat info
     */
    public List<User> getAllUsersForChat() {
        try {
            List<User> users = userRepository.findAll();
            log.info("Retrieved {} users for chat", users.size());
            return users;
        } catch (Exception e) {
            log.error("Error retrieving users for chat: {}", e.getMessage());
            throw new RuntimeException("Failed to retrieve users for chat");
        }
    }

    /**
     * Get user by ID for chat purposes (includes display name logic)
     *
     * @param userId The user ID
     * @return User with chat-friendly information
     */
    public User getUserForChat(Long userId) {
        try {
            Optional<User> user = userRepository.findById(userId);
            if (user.isPresent()) {
                User u = user.get();
                log.debug("Retrieved user for chat: {}", u.getUsername());
                return u;
            } else {
                log.warn("User not found for chat: {}", userId);
                return null;
            }
        } catch (Exception e) {
            log.error("Error retrieving user {} for chat: {}", userId, e.getMessage());
            return null;
        }
    }

    /**
     * Search users for chat (by username, first name, last name, email)
     *
     * @param query Search query
     * @return List of matching users
     */
    public List<User> searchUsersForChat(String query) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return new ArrayList<>();
            }

            String searchTerm = query.trim().toLowerCase();
            List<User> allUsers = userRepository.findAll();

            return allUsers.stream()
                    .filter(user ->
                            user.getUsername().toLowerCase().contains(searchTerm) ||
                                    (user.getFirstName() != null && user.getFirstName().toLowerCase().contains(searchTerm)) ||
                                    (user.getLastName() != null && user.getLastName().toLowerCase().contains(searchTerm)) ||
                                    (user.getEmail() != null && user.getEmail().toLowerCase().contains(searchTerm))
                    )
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error searching users for chat with query '{}': {}", query, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Get display name for a user (for chat purposes)
     *
     * @param user The user
     * @return Display name
     */
    public String getDisplayName(User user) {
        if (user == null) return "Unknown User";

        if (user.getFirstName() != null && !user.getFirstName().trim().isEmpty()) {
            if (user.getLastName() != null && !user.getLastName().trim().isEmpty()) {
                return user.getFirstName() + " " + user.getLastName();
            }
            return user.getFirstName();
        }

        return user.getUsername();
    }


    /**
     * Get users by role for chat
     *
     * @param role The user role
     * @return List of users with that role
     */
    public List<User> getUsersByRoleForChat(UserRole role) {
        try {
            return userRepository.findByRole(role);
        } catch (Exception e) {
            log.error("Error getting users by role {} for chat: {}", role, e.getMessage());
            return new ArrayList<>();
        }
    }
}