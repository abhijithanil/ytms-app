package com.insp17.ytms.service;

import com.insp17.ytms.dtos.UpdatePasswordRequest;
import com.insp17.ytms.dtos.UpdateProfileRequest;
import com.insp17.ytms.dtos.UserResponse;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.entity.UserStatus;
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

    public List<UserResponse> getAllUsers() {
        List<User> allActiveUsers = userRepository.findAllActiveUsers();
        return allActiveUsers.stream().map(UserResponse::new).collect(Collectors.toList());
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
        List<User> editors = userRepository.findByRole(UserRole.EDITOR);
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

    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User does not exists"));
        user.setUserStatus(UserStatus.DELETED);
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
        user.setFistName(request.getFirstName().trim());
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
}