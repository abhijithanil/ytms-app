package com.insp17.ytms.service;

import com.google.cloud.secretmanager.v1.*;
import com.google.protobuf.ByteString;
import com.insp17.ytms.dtos.YouTubeAccount;
import com.insp17.ytms.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class YouTubeAccountService {

    private static final String OAUTH_STATE_PREFIX = "youtube:oauth:state:";
    private static final String REFRESH_TOKEN_PREFIX = "YT_REFRESH_TOKEN_";
    // In-memory storage as fallback if Redis is not available
    private final Map<String, String> oauthStateStore = new HashMap<>();
    private final Map<String, YouTubeAccount> accountStore = new HashMap<>();
    @Value("${gcp.project-id}")
    private String projectId;
    @Autowired
    private SecretManagerServiceClient secretManagerServiceClient;
    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    /**
     * Save OAuth state temporarily for validation
     */
    public void saveOAuthState(String state, Long userId) {
        String key = OAUTH_STATE_PREFIX + state;
        if (redisTemplate != null) {
            redisTemplate.opsForValue().set(key, userId.toString(), 10, TimeUnit.MINUTES);
        } else {
            oauthStateStore.put(key, userId.toString());
            // Clean up old states
            cleanupOldStates();
        }
    }

    /**
     * Validate OAuth state and return user ID
     */
    public Long validateOAuthState(String state) {
        if (state == null) return null;

        String key = OAUTH_STATE_PREFIX + state;
        String userId;

        if (redisTemplate != null) {
            userId = redisTemplate.opsForValue().get(key);
            if (userId != null) {
                redisTemplate.delete(key);
            }
        } else {
            userId = oauthStateStore.remove(key);
        }

        return userId != null ? Long.parseLong(userId) : null;
    }

    /**
     * Save YouTube account with refresh token
     */
    public String saveYouTubeAccount(String email, String refreshToken, User addedBy) {
        try {
            String secretId = REFRESH_TOKEN_PREFIX + sanitizeEmail(email);
            ProjectName projectName = ProjectName.of(projectId);
            SecretName secretName = SecretName.of(projectId, secretId);

            // 1. Create the secret if it doesn't exist.
            try {
                secretManagerServiceClient.createSecret(
                        projectName,
                        secretId,
                        com.google.cloud.secretmanager.v1.Secret.newBuilder()
                                .setReplication(
                                        com.google.cloud.secretmanager.v1.Replication.newBuilder()
                                                .setAutomatic(com.google.cloud.secretmanager.v1.Replication.Automatic.newBuilder().build())
                                                .build()
                                )
                                .build()
                );
                log.info("Created new secret: {}", secretId);
            } catch (Exception e) {
                log.info("Secret {} already exists, proceeding to update versions.", secretId);
            }

            // 2. Disable all existing enabled versions of the secret.
            SecretManagerServiceClient.ListSecretVersionsPagedResponse pagedResponse = secretManagerServiceClient.listSecretVersions(secretName);
            for (SecretVersion version : pagedResponse.iterateAll()) {
                if (version.getState() == SecretVersion.State.ENABLED) {
                    log.info("Disabling old secret version: {}", version.getName());
                    DisableSecretVersionRequest disableRequest = DisableSecretVersionRequest.newBuilder()
                            .setName(version.getName())
                            .build();
                    secretManagerServiceClient.disableSecretVersion(disableRequest);
                }
            }

            // 3. Add the new refresh token as the latest, enabled version.
            SecretVersion newVersion = secretManagerServiceClient.addSecretVersion(
                    secretName, // Use the fully qualified SecretName object
                    SecretPayload.newBuilder()
                            .setData(ByteString.copyFromUtf8(refreshToken))
                            .build()
            );
            log.info("Added new secret version: {}", newVersion.getName());


            // 4. Store account info for in-app use.
            YouTubeAccount account = new YouTubeAccount();
            account.setEmail(email);
            account.setSecretName(secretId); // Store the ID, not the full name
            account.setAddedBy(addedBy.getUsername());
            account.setConnectedAt(LocalDateTime.now());

            accountStore.put(email, account);

            log.info("Successfully saved YouTube account {} with a new refresh token version.", email);
            return secretId;

        } catch (Exception e) {
            log.error("Failed to save YouTube account", e);
            throw new RuntimeException("Failed to save YouTube account: " + e.getMessage(), e);
        }
    }


    /**
     * Get refresh token for a YouTube account
     */
    public String getRefreshToken(String email) {
        try {
            String secretName = REFRESH_TOKEN_PREFIX + sanitizeEmail(email);
            String secretVersionName = String.format("projects/%s/secrets/%s/versions/latest",
                    projectId, secretName);

            String refreshToken = secretManagerServiceClient.accessSecretVersion(secretVersionName)
                    .getPayload().getData().toStringUtf8();

            return refreshToken;
        } catch (Exception e) {
            log.error("Failed to get refresh token for account: {}", email, e);
            throw new RuntimeException("Failed to get refresh token: " + e.getMessage());
        }
    }

    /**
     * Disconnect YouTube account
     */
    public void disconnectAccount(String email) {
        try {
            String secretName = REFRESH_TOKEN_PREFIX + sanitizeEmail(email);
            String fullSecretName = String.format("projects/%s/secrets/%s", projectId, secretName);

            // Delete the secret from Secret Manager
            secretManagerServiceClient.deleteSecret(fullSecretName);

            // Remove from local store
            accountStore.remove(email);

            log.info("Successfully disconnected YouTube account: {}", email);
        } catch (Exception e) {
            log.error("Failed to disconnect YouTube account", e);
            throw new RuntimeException("Failed to disconnect account: " + e.getMessage());
        }
    }

    /**
     * Get all connected YouTube accounts
     */
    public List<YouTubeAccount> getAllAccounts() {
        // In a production system, you'd want to persist this in a database
        return new ArrayList<>(accountStore.values());
    }

    /**
     * Check if account is connected
     */
    public boolean isAccountConnected(String email) {
        return accountStore.containsKey(email);
    }

    /**
     * Sanitize email for use in secret name
     */
    private String sanitizeEmail(String email) {
        return email.toLowerCase()
                .replace("@", "_at_")
                .replace(".", "_dot_")
                .replaceAll("[^a-z0-9_-]", "_");
    }

    /**
     * Clean up old OAuth states (for in-memory storage)
     */
    private void cleanupOldStates() {
        // Simple cleanup - in production, use proper expiration
        if (oauthStateStore.size() > 100) {
            oauthStateStore.clear();
        }
    }


}