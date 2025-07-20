package com.insp17.ytms.components;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTubeScopes;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import com.insp17.ytms.dtos.RefreshTokenResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.StringReader;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Component
@Slf4j
public class YouTubeRefreshTokenSetup {

    // UPDATED: Use VM IP instead of localhost
//    private static final String REDIRECT_URI = "http://34.173.178.188.nip.io:8080/api/youtube/oauth/callback";
    private static final String REDIRECT_URI = "http://localhost:8080/api/youtube/oauth/callback";

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
     * Generate authorization URL for specific channel
     */
    public String generateAuthorizationUrl(String channelName, String state) throws IOException, GeneralSecurityException {
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
                .setApprovalPrompt("force")
                .build();

        String authorizationUrl = flow.newAuthorizationUrl()
                .setRedirectUri(REDIRECT_URI)
                .setState(state)
                .build();

        log.info("=== YOUTUBE AUTHORIZATION SETUP FOR {} ===", channelName);
        log.info("1. Open this URL in your browser:");
        log.info("   {}", authorizationUrl);
        log.info("2. Sign in with the Google account that owns your YouTube channel");
        log.info("3. Make sure you're switched to the correct channel: {}", channelName);
        log.info("4. Grant permissions to your ytms-app");
        log.info("5. You'll be redirected automatically with the refresh token");
        log.info("===============================================");

        return authorizationUrl;
    }

    /**
     * Exchange authorization code for refresh token
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

        return new RefreshTokenResult(refreshToken, accessToken, expiresIn);
    }


}