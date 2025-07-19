package com.insp17.ytms.controllers;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.YouTubeScopes;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.insp17.ytms.components.YouTubeRefreshTokenSetup;
import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.RefreshTokenResult;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.YouTubeChannel;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.YouTubeAccountService;
import com.insp17.ytms.service.YouTubeChannelService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.StringReader;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/youtube/oauth")
@Slf4j
public class YouTubeOAuthController {

    @Autowired
    private YouTubeRefreshTokenSetup refreshTokenSetup;

    @Autowired
    private YouTubeAccountService youTubeAccountService;

    @Autowired
    private YouTubeChannelService youTubeChannelService;

    @Autowired
    private UserService userService;

    /**
     * Start OAuth flow for connecting a YouTube account
     */
    @GetMapping("/connect")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> startYouTubeConnect(@CurrentUser UserPrincipal userPrincipal, @RequestParam String channelName) {
        try {
            String state = UUID.randomUUID().toString();
            // Store state temporarily to validate callback
            youTubeAccountService.saveOAuthState(state, userPrincipal.getId());

            String authUrl = refreshTokenSetup.generateAuthorizationUrl(channelName) + "&state=" + state;

            Map<String, String> response = new HashMap<>();
            response.put("authorizationUrl", authUrl);
            response.put("instructions", "You will be redirected to Google to authorize access to your YouTube channels");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error starting YouTube OAuth flow", e);
            return ResponseEntity.status(500).body(
                    Collections.singletonMap("error", "Failed to start authorization: " + e.getMessage())
            );
        }
    }

    /**
     * OAuth callback - handles the response from Google
     */
    @GetMapping("/callback")
    public ResponseEntity<Map<String, Object>> handleOAuthCallback(
            @RequestParam("code") String authorizationCode,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error) {

        if (error != null) {
            log.error("OAuth error: {}", error);
            return ResponseEntity.status(400).body(
                    Collections.singletonMap("error", "Authorization failed: " + error)
            );
        }

        try {
            // Validate state and get user
            Long userId = youTubeAccountService.validateOAuthState(state);
            if (userId == null) {
                return ResponseEntity.status(400).body(
                        Collections.singletonMap("error", "Invalid or expired state")
                );
            }

            User user = userService.getUserById(userId);

            // Exchange code for tokens
            RefreshTokenResult tokenResult =
                    refreshTokenSetup.exchangeCodeForRefreshToken(authorizationCode);

            // Get YouTube channels for this account
            List<Channel> channels = getYouTubeChannels(tokenResult.getAccessToken());

            if (channels.isEmpty()) {
                return ResponseEntity.status(400).body(
                        Collections.singletonMap("error", "No YouTube channels found for this account")
                );
            }

            // Get the email of the YouTube account
            String youtubeEmail = getYouTubeAccountEmail(tokenResult.getAccessToken());

            // Save the YouTube account
            String accountId = youTubeAccountService.saveYouTubeAccount(
                    youtubeEmail,
                    tokenResult.getRefreshToken(),
                    user
            );

            // Save/update channels
            List<Map<String, String>> savedChannels = new ArrayList<>();
            for (Channel channel : channels) {
                try {
                    YouTubeChannel savedChannel = youTubeChannelService.createOrUpdateChannel(
                            channel.getSnippet().getTitle(),
                            channel.getId(),
                            "https://youtube.com/channel/" + channel.getId(),
                            channel.getSnippet().getThumbnails().getDefault().getUrl(),
                            youtubeEmail,
                            user
                    );

                    Map<String, String> channelInfo = new HashMap<>();
                    channelInfo.put("id", savedChannel.getId().toString());
                    channelInfo.put("name", savedChannel.getChannelName());
                    channelInfo.put("channelId", savedChannel.getChannelId());
                    savedChannels.add(channelInfo);
                } catch (Exception e) {
                    log.error("Error saving channel: {}", channel.getSnippet().getTitle(), e);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully connected YouTube account");
            response.put("email", youtubeEmail);
            response.put("channelsConnected", savedChannels.size());
            response.put("channels", savedChannels);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error in OAuth callback", e);
            return ResponseEntity.status(500).body(
                    Collections.singletonMap("error", "Failed to complete authorization: " + e.getMessage())
            );
        }
    }

    /**
     * List all connected YouTube accounts and their channels
     */
    @GetMapping("/accounts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getConnectedAccounts() {
        try {
            List<Map<String, Object>> accounts = youTubeAccountService.getAllAccounts().stream()
                    .map(account -> {
                        Map<String, Object> accountInfo = new HashMap<>();
                        accountInfo.put("email", account.getEmail());
                        accountInfo.put("connectedAt", account.getConnectedAt());

                        List<YouTubeChannel> channels = youTubeChannelService.getChannelsByOwnerEmail(account.getEmail());
                        accountInfo.put("channels", channels.stream()
                                .map(ch -> Map.of(
                                        "id", ch.getId(),
                                        "name", ch.getChannelName(),
                                        "channelId", ch.getChannelId()
                                ))
                                .collect(Collectors.toList())
                        );

                        return accountInfo;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(accounts);
        } catch (Exception e) {
            log.error("Error fetching connected accounts", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Disconnect a YouTube account
     */
    @DeleteMapping("/accounts/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> disconnectAccount(
            @PathVariable String email,
            @CurrentUser UserPrincipal userPrincipal) {
        try {
            youTubeAccountService.disconnectAccount(email);

            return ResponseEntity.ok(Map.of(
                    "message", "Successfully disconnected YouTube account: " + email
            ));
        } catch (Exception e) {
            log.error("Error disconnecting account", e);
            return ResponseEntity.status(500).body(
                    Map.of("error", "Failed to disconnect account: " + e.getMessage())
            );
        }
    }

    /**
     * Get YouTube channels using access token
     */
    private List<Channel> getYouTubeChannels(String accessToken) throws Exception {
        YouTube youtube = new YouTube.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                request -> request.getHeaders().setAuthorization("Bearer " + accessToken))
                .setApplicationName("ytms-app")
                .build();

        YouTube.Channels.List request = youtube.channels()
                .list(Arrays.asList("snippet", "contentDetails", "statistics"));
        request.setMine(true);

        ChannelListResponse response = request.execute();
        return response.getItems();
    }

    /**
     * Get YouTube account email using access token
     */
    private String getYouTubeAccountEmail(String accessToken) throws Exception {
        // You might need to use Google OAuth2 API to get user info
        // For now, returning a placeholder - implement proper user info retrieval
        YouTube youtube = new YouTube.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                request -> request.getHeaders().setAuthorization("Bearer " + accessToken))
                .setApplicationName("ytms-app")
                .build();

        // Get the first channel's owner email
        YouTube.Channels.List request = youtube.channels()
                .list(Arrays.asList("snippet"));
        request.setMine(true);
        request.setMaxResults(1L);

        ChannelListResponse response = request.execute();
        if (!response.getItems().isEmpty()) {
            // You'll need to implement proper email retrieval
            // This is a simplified version
            return response.getItems().get(0).getSnippet().getTitle() + "@youtube";
        }

        throw new RuntimeException("Could not determine YouTube account email");
    }
}