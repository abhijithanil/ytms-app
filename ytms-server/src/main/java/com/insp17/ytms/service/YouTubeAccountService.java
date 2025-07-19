package com.insp17.ytms.service;

import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretPayload;
import com.google.cloud.secretmanager.v1.SecretVersion;
import com.google.cloud.secretmanager.v1.ProjectName;
import com.google.protobuf.ByteString;
import com.insp17.ytms.dtos.YouTubeAccount;
import com.insp17.ytms.entity.User;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class YouTubeAccountService {

    @Value("${gcp.project-id}")
    private String projectId;

    @Autowired
    private SecretManagerServiceClient secretManagerServiceClient;

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    // In-memory storage as fallback if Redis is not available
    private final Map<String, String> oauthStateStore = new HashMap<>();
    private final Map<String, YouTubeAccount> accountStore = new HashMap<>();

    private static final String OAUTH_STATE_PREFIX = "youtube:oauth:state:";
    private static final String REFRESH_TOKEN_PREFIX = "YT_REFRESH_TOKEN_";

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
            // Create a unique secret name for this account
            String secretName = REFRESH_TOKEN_PREFIX + sanitizeEmail(email);

            // Create or update the secret in Secret Manager
            try {
                // Try to create new secret
                secretManagerServiceClient.createSecret(
                        ProjectName.of(projectId),
                        secretName,
                        com.google.cloud.secretmanager.v1.Secret.newBuilder()
                                .setReplication(
                                        com.google.cloud.secretmanager.v1.Replication.newBuilder()
                                                .setAutomatic(com.google.cloud.secretmanager.v1.Replication.Automatic.newBuilder())
                                                .build()
                                )
                                .build()
                );
            } catch (Exception e) {
                // Secret might already exist, that's okay
                log.info("Secret {} already exists, will add new version", secretName);
            }

            // Add the refresh token as a new version
            SecretVersion version = secretManagerServiceClient.addSecretVersion(
                    secretName,
                    SecretPayload.newBuilder()
                            .setData(ByteString.copyFromUtf8(refreshToken))
                            .build()
            );

            // Store account info
            YouTubeAccount account = new YouTubeAccount();
            account.setEmail(email);
            account.setSecretName(secretName);
            account.setAddedBy(addedBy.getUsername());
            account.setConnectedAt(LocalDateTime.now());

            accountStore.put(email, account);

            log.info("Successfully saved YouTube account {} with refresh token", email);
            return secretName;

        } catch (Exception e) {
            log.error("Failed to save YouTube account", e);
            throw new RuntimeException("Failed to save YouTube account: " + e.getMessage());
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