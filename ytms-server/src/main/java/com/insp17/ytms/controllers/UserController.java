package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<User> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        User user = new User(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getRole()
        );
        User createdUser = userService.createUser(user);
        return ResponseEntity.ok(createdUser);
    }

    @GetMapping("/editors")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<List<User>> getEditors() {
        return ResponseEntity.ok(userService.getEditors());
    }

    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAdmins() {
        return ResponseEntity.ok(userService.getAdmins());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        User userDetails = new User();
        userDetails.setUsername(request.getUsername());
        userDetails.setEmail(request.getEmail());
        userDetails.setRole(request.getRole());
        User updatedUser = userService.updateUser(id, userDetails);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/profile")
    @PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    public ResponseEntity<User> updateUserProfile(@PathVariable Long id, @RequestBody UpdateProfileRequest request) {
        User updatedUser = userService.updateUserProfile(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("#id == authentication.principal.id")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody UpdatePasswordRequest request) {
        userService.changePassword(id, request);
        return ResponseEntity.ok(new ApiResponse(true, "Password changed successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}