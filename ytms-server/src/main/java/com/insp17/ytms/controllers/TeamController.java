package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.InviteRequest;
import com.insp17.ytms.dtos.UserResponse;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.EmailService;
import com.insp17.ytms.service.UUIDService;
import com.insp17.ytms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/team")
public class TeamController {
    @Autowired
    private UserService userService;

    @Autowired
    private UUIDService uuidService;

    @Autowired
    private EmailService emailService;


    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PreAuthorize("hasAnyRole('ADMIN')")
    @PostMapping("invite")
    public ResponseEntity<Map<String, String>> createInvite(@RequestBody InviteRequest inviteRequest) {

        Map<String, String> userInviteRequest = uuidService.createUserInviteRequest(inviteRequest);
        emailService.sendUserInviteEmail(userInviteRequest.get("url"), inviteRequest);
        return ResponseEntity.ok(userInviteRequest);
    }

}
