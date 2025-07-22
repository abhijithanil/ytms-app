package com.insp17.ytms.controllers;

import com.insp17.ytms.components.RateLimited;
import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.entity.UserStatus;
import com.insp17.ytms.security.JwtTokenUtil;
import com.insp17.ytms.service.*;
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

    @Autowired
    private MfaService mfaService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest signUpRequest) {
        try {
            // Check if username already exists
            if (userService.existsByUsername(signUpRequest.getUsername())) {
                return ResponseEntity.badRequest()
                        .body(new UserRegistrationResponse(false, "Username is already taken!"));
            }

            // Check if email already exists
            if (userService.existsByEmail(signUpRequest.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(new UserRegistrationResponse(false, "Email Address already in use!"));
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

            UserResponse result = userService.createUser(user);

            String token = uuidService.generateVerificationToken(signUpRequest.getEmail());
            emailService.sendUserVerificationEmail(signUpRequest.getEmail(), token);
            emailService.notifyAdminsForApproval(signUpRequest);

            return ResponseEntity.ok(new UserRegistrationResponse(true, "User registered successfully", result.getId(), result.getUsername()));

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
            UserResponse user = userService.getUserById(userPrincipal.getId());

            if (user.isMfaEnabled()) {
                Map<String, Object> response = new HashMap<>();
                response.put("mfaRequired", true);
                response.put("username", user.getUsername());
                return ResponseEntity.ok(response);
            }

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

    @PostMapping("/login/verify")
    public ResponseEntity<?> verifyCode(@RequestBody MfaVerifyCodeRequest verifyCodeRequest) {
        try {
            UserResponse user = userService.getUserByUsername(verifyCodeRequest.getUsername());
            if (!mfaService.verifyTotp(user.getSecret(), verifyCodeRequest.getToken())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse(false, "Invalid OTP"));
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(verifyCodeRequest.getUsername());
            String jwt = jwtTokenUtil.generateToken(userDetails);
            return ResponseEntity.ok(new JwtAuthenticationResponse(jwt, (UserPrincipal) userDetails));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiResponse(false, "Verification failed"));
        }
    }

    @GetMapping("/mfa/status/{userId}")
    @PreAuthorize("#userPrincipal.id == #userId")
    public ResponseEntity<MfaStatusResponse> getMfaStatus(@CurrentUser UserPrincipal userPrincipal,
                                                          @PathVariable Long userId) {
        try {
            UserResponse user = userService.getUserById(userId);
            return ResponseEntity.ok(new MfaStatusResponse(
                    user.isMfaEnabled(),
                    user.getSecret() != null ? "Secret configured" : "No secret configured"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MfaStatusResponse(false, "Error checking MFA status"));
        }
    }

    // Alternative: Get MFA status for current user
    @GetMapping("/mfa/status")
    public ResponseEntity<MfaStatusResponse> getCurrentUserMfaStatus(@CurrentUser UserPrincipal userPrincipal) {
        try {
            UserResponse user = userService.getUserById(userPrincipal.getId());
            return ResponseEntity.ok(new MfaStatusResponse(
                    user.isMfaEnabled(),
                    user.getSecret() != null ? "Secret configured" : "No secret configured"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MfaStatusResponse(false, "Error checking MFA status"));
        }
    }

    @RateLimited
    @PostMapping("/mfa/signup/enable")
    public ResponseEntity<?> enableMfaSingup(@RequestBody MfaGenericRequest enableMfaRequest) {
        try {
            UserResponse user = userService.getUserById(enableMfaRequest.getUserId());

            if (user.isMfaEnabled()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ErrorResponse("MFA already enabled for user"));
            }

            // Generate secret and enable MFA
            String secret = mfaService.generateNewSecret();
            uuidService.saveUserMFASecretTemp(String.valueOf(enableMfaRequest.getUserId()), secret);

            // Generate QR code as base64 data URI
            String qrCodeDataUri = mfaService.generateQrCodeImageAsDataUri(user.getUsername(), secret);

            return ResponseEntity.ok(new MfaEnableResponse(qrCodeDataUri));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to enable MFA: " + e.getMessage()));
        }
    }

    @PostMapping("/mfa/enable")
    @PreAuthorize("#userPrincipal.id == #enableMfaRequest.userId")
    public ResponseEntity<?> enableMfa(@CurrentUser UserPrincipal userPrincipal, @RequestBody MfaGenericRequest enableMfaRequest) {
        try {
            UserResponse user = userService.getUserById(userPrincipal.getId());

            if (user.isMfaEnabled()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ErrorResponse("MFA already enabled for user"));
            }

            // Generate secret and enable MFA
            String secret = mfaService.generateNewSecret();
            uuidService.saveUserMFASecretTemp(String.valueOf(userPrincipal.getId()), secret);

            // Generate QR code as base64 data URI
            String qrCodeDataUri = mfaService.generateQrCodeImageAsDataUri(user.getUsername(), secret);

            return ResponseEntity.ok(new MfaEnableResponse(qrCodeDataUri));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to enable MFA: " + e.getMessage()));
        }
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<?> verifyMfa(@RequestBody MfaVerifyCodeRequest verifyRequest) {
        try {
            User user = userService.getUserByIdPrivateUse(verifyRequest.getUserId());

            if (user.isMfaEnabled()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ErrorResponse("MFA already enabled for user"));
            }

            String secret = uuidService.fetchAndDeleteUserMFASecretTemp(String.valueOf(verifyRequest.getUserId()));

            if (secret == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("MFA setup not initiated"));
            }


            // Verify the TOTP code
            boolean isValid = mfaService.verifyTotp(secret, verifyRequest.getToken());

            if (isValid) {
                // Enable MFA now that verification is successful
                user.setMfaEnabled(true);
                user.setSecret(secret);
                userService.updateUser(user);

                return ResponseEntity.ok(new MfaVerifyResponse("MFA enabled successfully"));
            } else {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Invalid verification code"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to verify MFA: " + e.getMessage()));
        }
    }

    @PostMapping("/mfa/disable")
    @PreAuthorize("#userPrincipal.id == #disableMfaRequest.userId")
    public ResponseEntity<?> disableMfa(@CurrentUser UserPrincipal userPrincipal, @RequestBody MfaGenericRequest disableMfaRequest) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        user.setMfaEnabled(false);
        userService.updateUser(user);
        return ResponseEntity.ok(new ApiResponse(true, "MFA disabled successfully"));
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
    public ResponseEntity<UserResponse> getCurrentUser(@CurrentUser UserPrincipal userPrincipal) {
        UserResponse user = userService.getUserById(userPrincipal.getId());
        return ResponseEntity.ok(user);
    }

    @RateLimited
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

    @RateLimited
    @PostMapping("/accept-invite/{token}")
    public ResponseEntity<UserRegistrationResponse> acceptInvitation(@RequestBody UserDTO userDTO, @PathVariable String token) {
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

            UserResponse result = userService.createUser(user);
            uuidService.removeInviteRequest(token);
            UserRegistrationResponse response = new UserRegistrationResponse(true, "User registered successfully", result.getId(), result.getUsername());
            return ResponseEntity.ok(response);
        } else {
            UserRegistrationResponse response = new UserRegistrationResponse(false, "Invalid acceptance token, or expired");
            return ResponseEntity.status(401).body(response);
        }
    }

    @PostMapping("/decline-invite/{token}")
    public void declineInvitation(@PathVariable String token) {
        Optional<InviteRequest> inviteRequestOp = uuidService.getUserInviteRequest(token);
        if (inviteRequestOp.isPresent()) {
            long invitor = inviteRequestOp.get().getInvitedBy();
            UserResponse user = userService.getUserById(invitor);
            emailService.sendUserInvitationDeclineEmail(user.getEmail(), inviteRequestOp.get());
            uuidService.removeInviteRequest(token);
        }
    }

}