package com.insp17.ytms.service;

import com.insp17.ytms.dtos.UpdatePasswordRequest;
import com.insp17.ytms.dtos.UpdateProfileRequest;
import com.insp17.ytms.dtos.UpdateUserRequest;
import com.insp17.ytms.dtos.UserResponse;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
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
}