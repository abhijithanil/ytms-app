package com.insp17.ytms.components;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTubeScopes;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Utility class for setting up YouTube refresh tokens
 * This is a one-time setup process for each YouTube channel
 */
@Component
@Slf4j
public class YouTubeRefreshTokenSetup {

    private static final String REDIRECT_URI = "http://localhost:8080/oauth/callback";

    @Value("${gcp.project-id}")
    private String projectId;

    @Value("${gcp.client-secret-key:client_data}")
    private String clientSecretKey;

    @Autowired
    private SecretManagerServiceClient secretManagerServiceClient;

    /**
     * Fetches client secrets from Secret Manager
     */
    private String fetchClientDetails() {
        try {
            SecretVersionName secretVersionName = SecretVersionName.of(projectId, clientSecretKey, "latest");
            String payload = secretManagerServiceClient.accessSecretVersion(secretVersionName)
                    .getPayload().getData().toStringUtf8();
            return payload;
        } catch (Exception e) {
            log.error("Failed to fetch client details from Secret Manager", e);
            throw new RuntimeException("Unable to retrieve client credentials", e);
        }
    }

    /**
     * Step 1: Generate authorization URL
     * Send the user to this URL to authorize your application
     */
    public String generateAuthorizationUrl() throws IOException, GeneralSecurityException {


        final String clientSecretsJson = fetchClientDetails();

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(),
                new StringReader(clientSecretsJson)
        );

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(YouTubeScopes.YOUTUBE))
                .setAccessType("offline")           // Critical: This ensures we get a refresh token
                .setApprovalPrompt("force")         // Forces consent screen even if previously authorized
                .build();

        String authorizationUrl = flow.newAuthorizationUrl()
                .setRedirectUri(REDIRECT_URI)
                .setState("youtube-setup")          // Optional: helps track the request
                .build();

        log.info("=== YOUTUBE AUTHORIZATION SETUP ===");
        log.info("1. Open this URL in your browser:");
        log.info("   {}", authorizationUrl);
        log.info("2. Sign in with the Google account that owns your YouTube channel");
        log.info("3. Grant permissions to your ytms-app");
        log.info("4. Copy the authorization code from the callback URL");
        log.info("5. Use the code with exchangeCodeForRefreshToken() method");
        log.info("=====================================");

        return authorizationUrl;
    }

    /**
     * Step 2: Exchange authorization code for refresh token
     * Use the code you get from the callback URL after user authorization
     */
    public RefreshTokenResult exchangeCodeForRefreshToken(String authorizationCode)
            throws IOException, GeneralSecurityException {

        final String clientSecretsJson = fetchClientDetails();

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(),
                new StringReader(clientSecretsJson)
        );

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(YouTubeScopes.YOUTUBE))
                .setAccessType("offline")
                .build();

        GoogleTokenResponse tokenResponse = flow.newTokenRequest(authorizationCode)
                .setRedirectUri(REDIRECT_URI)
                .execute();

        String refreshToken = tokenResponse.getRefreshToken();
        String accessToken = tokenResponse.getAccessToken();
        Long expiresIn = tokenResponse.getExpiresInSeconds();

        if (refreshToken == null) {
            throw new IOException(
                    "No refresh token received! Make sure:\n" +
                            "1. You used access_type=offline\n" +
                            "2. You used approval_prompt=force\n" +
                            "3. This is the first time authorizing this app for this user\n" +
                            "4. You revoked previous access in Google Account settings if needed"
            );
        }

        log.info("=== REFRESH TOKEN SETUP SUCCESSFUL ===");
        log.info("Refresh Token: {}", refreshToken);
        log.info("Access Token: {}", accessToken.substring(0, 20) + "...");
        log.info("Expires In: {} seconds", expiresIn);
        log.info("=====================================");
        log.info("IMPORTANT: Store the refresh token securely in Google Secret Manager:");
        log.info("gcloud secrets create YT_REFRESH_TOKEN --data-string=\"{}\"", refreshToken);
        log.info("=====================================");

        return new RefreshTokenResult(refreshToken, accessToken, expiresIn);
    }

    /**
     * Helper method to revoke existing tokens (if you need to start fresh)
     */
    public void revokeExistingTokens(String refreshToken) throws IOException {
        // This will revoke the refresh token and all associated access tokens
        String revokeUrl = "https://oauth2.googleapis.com/revoke?token=" + refreshToken;

        // You can call this URL or use Google's client library
        log.info("To revoke existing tokens, visit: {}", revokeUrl);
        log.info("Or go to: https://myaccount.google.com/permissions");
        log.info("And remove ytms-app permissions, then re-authorize");
    }

    /**
     * Result class for refresh token exchange
     */
    public static class RefreshTokenResult {
        private final String refreshToken;
        private final String accessToken;
        private final Long expiresInSeconds;

        public RefreshTokenResult(String refreshToken, String accessToken, Long expiresInSeconds) {
            this.refreshToken = refreshToken;
            this.accessToken = accessToken;
            this.expiresInSeconds = expiresInSeconds;
        }

        public String getRefreshToken() {
            return refreshToken;
        }

        public String getAccessToken() {
            return accessToken;
        }

        public Long getExpiresInSeconds() {
            return expiresInSeconds;
        }
    }
}