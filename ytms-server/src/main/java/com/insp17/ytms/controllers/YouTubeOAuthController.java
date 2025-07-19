package com.insp17.ytms.controllers;

import com.insp17.ytms.components.YouTubeRefreshTokenSetup;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/oauth")
@Slf4j
class YouTubeOAuthController {

    @Autowired
    private YouTubeRefreshTokenSetup refreshTokenSetup;

    /**
     * Endpoint to start the OAuth flow
     * GET /oauth/start-youtube-setup
     */
    @GetMapping("/start-youtube-setup")
    public ResponseEntity<Map<String, String>> startYouTubeSetup() {
        try {

            String authUrl = refreshTokenSetup.generateAuthorizationUrl();

            Map<String, String> response = new HashMap<>();
            response.put("authorization_url", authUrl);
            response.put("instructions", "Open this URL in your browser and authorize the application");
            response.put("next_step", "After authorization, you'll be redirected to /oauth/callback with a 'code' parameter");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error generating authorization URL", e);
            return ResponseEntity.status(500).body(
                    Collections.singletonMap("error", "Failed to generate authorization URL: " + e.getMessage())
            );
        }
    }

    /**
     * OAuth callback endpoint
     * This is where Google redirects after user authorization
     * GET /oauth/callback?code=AUTH_CODE&state=youtube-setup
     */
    @GetMapping("/callback")
    public ResponseEntity<Map<String, Object>> handleOAuthCallback(
            @RequestParam("code") String authorizationCode,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error) {

        if (error != null) {
            log.error("OAuth error: {}", error);
            return ResponseEntity.status(400).body(
                    Collections.singletonMap("error", "OAuth authorization failed: " + error)
            );
        }

        try {
            // Path to your client_secrets.json file
            String clientSecretsPath = "src/main/resources/client_secrets.json";

            YouTubeRefreshTokenSetup.RefreshTokenResult result =
                    refreshTokenSetup.exchangeCodeForRefreshToken(authorizationCode, clientSecretsPath);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("refresh_token", result.getRefreshToken());
            response.put("access_token", result.getAccessToken().substring(0, 20) + "...");
            response.put("expires_in_seconds", result.getExpiresInSeconds());
            response.put("instructions", Arrays.asList(
                    "IMPORTANT: Store this refresh token securely!",
                    "Run this command to store in Google Secret Manager:",
                    "gcloud secrets create YT_REFRESH_TOKEN --data-string=\"" + result.getRefreshToken() + "\"",
                    "Your YouTube channel is now ready for automated uploads!"
            ));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error exchanging authorization code for refresh token", e);
            return ResponseEntity.status(500).body(
                    Collections.singletonMap("error", "Failed to get refresh token: " + e.getMessage())
            );
        }
    }

    /**
     * Manual endpoint to exchange authorization code (alternative to callback)
     * POST /oauth/exchange-code
     */
    @PostMapping("/exchange-code")
    public ResponseEntity<Map<String, Object>> exchangeAuthCode(@RequestBody Map<String, String> request) {
        String authorizationCode = request.get("authorization_code");

        if (authorizationCode == null || authorizationCode.trim().isEmpty()) {
            return ResponseEntity.status(400).body(
                    Collections.singletonMap("error", "authorization_code is required")
            );
        }

        try {
            String clientSecretsPath = "src/main/resources/client_secrets.json";

            YouTubeRefreshTokenSetup.RefreshTokenResult result =
                    refreshTokenSetup.exchangeCodeForRefreshToken(authorizationCode, clientSecretsPath);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("refresh_token", result.getRefreshToken());
            response.put("message", "Refresh token generated successfully!");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error exchanging authorization code", e);
            return ResponseEntity.status(500).body(
                    Collections.singletonMap("error", e.getMessage())
            );
        }
    }
}