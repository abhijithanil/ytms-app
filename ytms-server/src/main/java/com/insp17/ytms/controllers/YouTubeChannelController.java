package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.YouTubeChannel;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.YouTubeChannelService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/youtube-channels")
@Slf4j
public class YouTubeChannelController {

    @Autowired
    private YouTubeChannelService youTubeChannelService;

    @Autowired
    private UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<List<YouTubeChannelDTO>> getAllChannels(@CurrentUser UserPrincipal userPrincipal) {
        try {
            List<YouTubeChannel> channels = youTubeChannelService.getChannelsAccessibleByUser(userPrincipal.getId());
            List<YouTubeChannelDTO> channelDTOs = channels.stream()
                    .map(YouTubeChannelDTO::new)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(channelDTOs);
        } catch (Exception e) {
            log.error("Error fetching YouTube channels for user {}: {}", userPrincipal.getId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<YouTubeChannelDTO> getChannelById(@PathVariable Long id,
                                                            @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

        try {
            if (!youTubeChannelService.canUserAccessChannel(id, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            YouTubeChannel channel = youTubeChannelService.getChannelById(id)
                    .orElseThrow(() -> new RuntimeException("Channel not found"));

            return ResponseEntity.ok(new YouTubeChannelDTO(channel));
        } catch (RuntimeException e) {
            log.error("Error fetching YouTube channel {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Unexpected error fetching YouTube channel {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<YouTubeChannelResponse> createChannel(
            @Valid @RequestBody CreateYouTubeChannelRequest request,
            @CurrentUser UserPrincipal userPrincipal) {
        try {
            User addedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());
            YouTubeChannel channel = youTubeChannelService.createChannel(request, addedBy);

            YouTubeChannelDTO channelDTO = new YouTubeChannelDTO(channel);
            YouTubeChannelResponse response = new YouTubeChannelResponse(
                    true,
                    "YouTube channel created successfully",
                    channelDTO
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            log.error("Error creating YouTube channel: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    new YouTubeChannelResponse(false, e.getMessage())
            );
        } catch (Exception e) {
            log.error("Unexpected error creating YouTube channel: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new YouTubeChannelResponse(false, "Failed to create YouTube channel")
            );
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<YouTubeChannelResponse> updateChannel(
            @PathVariable Long id,
            @Valid @RequestBody UpdateYouTubeChannelRequest request,
            @CurrentUser UserPrincipal userPrincipal) {
        try {
            User updatedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());
            YouTubeChannel channel = youTubeChannelService.updateChannel(id, request, updatedBy);

            YouTubeChannelDTO channelDTO = new YouTubeChannelDTO(channel);
            YouTubeChannelResponse response = new YouTubeChannelResponse(
                    true,
                    "YouTube channel updated successfully",
                    channelDTO
            );

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error updating YouTube channel {}: {}", id, e.getMessage());
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            if (e.getMessage().contains("permission")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                        new YouTubeChannelResponse(false, e.getMessage())
                );
            }
            return ResponseEntity.badRequest().body(
                    new YouTubeChannelResponse(false, e.getMessage())
            );
        } catch (Exception e) {
            log.error("Unexpected error updating YouTube channel {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new YouTubeChannelResponse(false, "Failed to update YouTube channel")
            );
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<YouTubeChannelResponse> deleteChannel(
            @PathVariable Long id,
            @CurrentUser UserPrincipal userPrincipal) {
        try {
            User deletedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());
            youTubeChannelService.deleteChannel(id, deletedBy);

            return ResponseEntity.ok(new YouTubeChannelResponse(
                    true,
                    "YouTube channel deleted successfully"
            ));
        } catch (RuntimeException e) {
            log.error("Error deleting YouTube channel {}: {}", id, e.getMessage());
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            if (e.getMessage().contains("permission")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                        new YouTubeChannelResponse(false, e.getMessage())
                );
            }
            return ResponseEntity.badRequest().body(
                    new YouTubeChannelResponse(false, e.getMessage())
            );
        } catch (Exception e) {
            log.error("Unexpected error deleting YouTube channel {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new YouTubeChannelResponse(false, "Failed to delete YouTube channel")
            );
        }
    }

    @PostMapping("/{id}/access")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<YouTubeChannelResponse> manageChannelAccess(
            @PathVariable Long id,
            @Valid @RequestBody ManageChannelAccessRequest request,
            @CurrentUser UserPrincipal userPrincipal) {
        try {
            User modifiedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());

            if ("ADD".equalsIgnoreCase(request.getAction())) {
                youTubeChannelService.addUserAccess(id, request.getUserIds(), modifiedBy);
                return ResponseEntity.ok(new YouTubeChannelResponse(
                        true,
                        "User access added successfully"
                ));
            } else if ("REMOVE".equalsIgnoreCase(request.getAction())) {
                youTubeChannelService.removeUserAccess(id, request.getUserIds(), modifiedBy);
                return ResponseEntity.ok(new YouTubeChannelResponse(
                        true,
                        "User access removed successfully"
                ));
            } else {
                return ResponseEntity.badRequest().body(
                        new YouTubeChannelResponse(false, "Invalid action. Use 'ADD' or 'REMOVE'")
                );
            }
        } catch (RuntimeException e) {
            log.error("Error managing access for YouTube channel {}: {}", id, e.getMessage());
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            if (e.getMessage().contains("permission")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                        new YouTubeChannelResponse(false, e.getMessage())
                );
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new YouTubeChannelResponse(false, "Failed to delete YouTube channel")
            );
        }
    }

    /**
     * Get all channels grouped by YouTube account
     */
    @GetMapping("/grouped")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<YouTubeChannelsGroupedResponse> getChannelsGroupedByAccount(
            @CurrentUser UserPrincipal userPrincipal) {
        try {
            Map<String, List<YouTubeChannel>> groupedChannels =
                    youTubeChannelService.getChannelsGroupedByOwner(userPrincipal.getId());

            YouTubeChannelsGroupedResponse response = new YouTubeChannelsGroupedResponse();
            response.setSuccess(true);
            response.setMessage("Channels fetched successfully");

            for (Map.Entry<String, List<YouTubeChannel>> entry : groupedChannels.entrySet()) {
                YouTubeAccountGroup accountGroup =
                        new YouTubeAccountGroup();
                accountGroup.setEmail(entry.getKey());
                accountGroup.setChannelCount(entry.getValue().size());
                accountGroup.setChannels(
                        entry.getValue().stream()
                                .map(YouTubeChannelDTO::new)
                                .collect(Collectors.toList())
                );
                response.getAccounts().add(accountGroup);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching grouped channels for user {}: {}", userPrincipal.getId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    new YouTubeChannelsGroupedResponse(false, "Failed to fetch channels", new ArrayList<>())
            );
        }
    }
}