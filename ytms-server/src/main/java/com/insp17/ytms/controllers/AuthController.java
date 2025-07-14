package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.entity.UserStatus;
import com.insp17.ytms.security.JwtTokenUtil;
import com.insp17.ytms.service.CustomUserDetailsService;
import com.insp17.ytms.service.EmailService;
import com.insp17.ytms.service.UUIDService;
import com.insp17.ytms.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

// Authentication Controller
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private UUIDService uuidService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest signUpRequest) {
        try {
            // Check if username already exists
            if (userService.existsByUsername(signUpRequest.getUsername())) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse(false, "Username is already taken!"));
            }

            // Check if email already exists
            if (userService.existsByEmail(signUpRequest.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse(false, "Email Address already in use!"));
            }

            // Create new user
            User user = new User(
                    signUpRequest.getFirstName(),
                    signUpRequest.getLastName(),
                    signUpRequest.getUsername(),
                    signUpRequest.getEmail(),
                    signUpRequest.getPassword(),
                    UserRole.VIEWER,
                    UserStatus.INACTIVE
            );

            User result = userService.createUser(user);

            String token = uuidService.generateVerificationToken(signUpRequest.getEmail());
            emailService.sendUserVerificationEmail(signUpRequest.getEmail(), token);
            emailService.notifyAdminsForApproval(signUpRequest);

            return ResponseEntity.ok(new ApiResponse(true, "User registered successfully"));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Error: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            String jwt = jwtTokenUtil.generateToken(userPrincipal);

            return ResponseEntity.ok(new JwtAuthenticationResponse(jwt, userPrincipal));

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid username or password"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Authentication failed"));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request) {
        String authToken = request.getHeader("Authorization");

        if (authToken != null && authToken.startsWith("Bearer ")) {
            String token = authToken.substring(7);

            try {
                String username = jwtTokenUtil.getUsernameFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtTokenUtil.validateToken(token, userDetails)) {
                    String newToken = jwtTokenUtil.generateToken(userDetails);
                    return ResponseEntity.ok(new JwtAuthenticationResponse(newToken, (UserPrincipal) userDetails));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Invalid token"));
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "No valid token provided"));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<UserDTO> getCurrentUser(@CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserById(userPrincipal.getId());
        return ResponseEntity.ok(new UserDTO(user));
    }

    @PostMapping("/validate-token")
    public ResponseEntity<Map<String, String>> validateToken(@RequestBody ValidateTokenRequest validateTokenRequest) {
        Optional<InviteRequest> inviteRequestOp = uuidService.getUserInviteRequest(validateTokenRequest.getToken());
        Map<String, String> resp = new HashMap<>();
        if (inviteRequestOp.isPresent()) {
            InviteRequest inviteRequest = inviteRequestOp.get();
            resp.put("message", "Valid token");
            resp.put("email", inviteRequest.getEmail());
            resp.put("userRole", inviteRequest.getUserRole().name());
            return ResponseEntity.ok(resp);
        } else {
            resp.put("error", "Invalid token, or expired");
            return ResponseEntity.status(401).body(resp);
        }
    }

    @PostMapping("/accept-invite/{token}")
    public ResponseEntity<Map<String, String>> acceptInvitation(@RequestBody UserDTO userDTO, @PathVariable String token) {
        Map<String, String> resp = new HashMap<>();
        Optional<InviteRequest> inviteRequestOp = uuidService.getUserInviteRequest(token);
        if (inviteRequestOp.isPresent()) {
            InviteRequest inviteRequest = inviteRequestOp.get();
            userDTO.setEmail(inviteRequest.getEmail());
            userDTO.setRole(inviteRequest.getUserRole());

            User user = new User(
                    userDTO.getFirstName(),
                    userDTO.getLastName(),
                    userDTO.getUsername(),
                    userDTO.getEmail(),
                    userDTO.getPassword(),
                    userDTO.getRole(),
                    UserStatus.ACTIVE
            );

            User result = userService.createUser(user);
            uuidService.removeInviteRequest(token);
            resp.put("message", "User created");
            return ResponseEntity.ok(resp);
        } else {
            resp.put("error", "Invalid token, or expired");
            return ResponseEntity.status(401).body(resp);
        }
    }

    @PostMapping("/decline-invite/{token}")
    public void declineInvitation(@PathVariable String token) {
        Optional<InviteRequest> inviteRequestOp = uuidService.getUserInviteRequest(token);
        if (inviteRequestOp.isPresent()) {
            long invitor = inviteRequestOp.get().getInvitedBy();
            User user = userService.getUserById(invitor);
            emailService.sendUserInvitationDeclineEmail(user.getEmail(), inviteRequestOp.get());
            uuidService.removeInviteRequest(token);
        }
    }

}