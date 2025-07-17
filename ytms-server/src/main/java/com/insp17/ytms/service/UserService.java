package com.insp17.ytms.service;

import com.insp17.ytms.dtos.UpdatePasswordRequest;
import com.insp17.ytms.dtos.UpdateProfileRequest;
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

    public List<User> getAllUsers() {
        return userRepository.findAllActiveUsers();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public List<User> getEditors() {
        return userRepository.findByRole(UserRole.EDITOR);
    }

    public List<User> getAdmins() {
        return userRepository.findByRole(UserRole.ADMIN);
    }

    public User updateUser(User userDetails) {
        return userRepository.save(userDetails);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User does not exists"));
        user.setUserStatus(UserStatus.DELETED);
    }

    public User getMainAdmin() {
        return userRepository.findFirstByRoleOrderByIdAsc(UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("No admin user found to reassign tasks to."));
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public User updateUserProfile(Long id, UpdateProfileRequest request) {
        User user = getUserById(id);
        user.setFistName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        return userRepository.save(user);
    }

    public void changePassword(Long id, UpdatePasswordRequest request) {
        User user = getUserById(id);
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Incorrect current password");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}