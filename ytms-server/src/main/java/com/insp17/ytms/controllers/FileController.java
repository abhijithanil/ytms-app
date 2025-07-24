package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.AudioInstructionRepository;
import com.insp17.ytms.repository.RawVideoRepository;
import com.insp17.ytms.service.FileStorageService;
import com.insp17.ytms.service.RevisionService;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/files")
//@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class FileController {

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private VideoTaskService videoTaskService;

    @Autowired
    private RevisionService revisionService;

    @Autowired
    private UserService userService;

    @Autowired
    private AudioInstructionRepository audioInstructionRepository;

    @Autowired
    private RawVideoRepository rawVideoRepository;

    // Legacy raw video streaming (backward compatibility)
    @GetMapping("/video/{taskId}")
    public ResponseEntity<Resource> streamRawVideo(@PathVariable Long taskId,
                                                   @CurrentUser UserPrincipal userPrincipal,
                                                   HttpServletRequest request) {
        try {
            System.out.println("Streaming legacy raw video for task: " + taskId + " by user: " + userPrincipal.getUsername());
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                System.out.println("User " + userPrincipal.getUsername() + " denied access to task " + taskId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoTask task = videoTaskService.getTaskById(taskId);
            if (task.getRawVideoUrl() == null) {
                System.out.println("No raw video URL found for task " + taskId);
                return ResponseEntity.notFound().build();
            }

            System.out.println("Downloading file from: " + task.getRawVideoUrl());
            byte[] fileContent = fileStorageService.downloadFile(task.getRawVideoUrl());

            if (fileContent == null || fileContent.length == 0) {
                System.out.println("File content is empty for task " + taskId);
                return ResponseEntity.notFound().build();
            }

            String filename = task.getRawVideoFilename() != null ? task.getRawVideoFilename() : "video.mp4";
            String contentType = getContentType(filename);

            return handleRangeRequest(request, fileContent, filename, contentType);

        } catch (IOException e) {
            System.err.println("Error streaming video for task " + taskId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            System.err.println("Unexpected error streaming video for task " + taskId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // NEW: Stream specific raw video
    @GetMapping("/raw-video/{rawVideoId}")
    public ResponseEntity<Resource> streamSpecificRawVideo(@PathVariable Long rawVideoId,
                                                           @CurrentUser UserPrincipal userPrincipal,
                                                           HttpServletRequest request) {
        try {
            System.out.println("Streaming raw video: " + rawVideoId + " by user: " + userPrincipal.getUsername());
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                    .orElseThrow(() -> new RuntimeException("Raw video not found"));

            if (!videoTaskService.canUserAccessTask(rawVideo.getVideoTask().getId(), user)) {
                System.out.println("User " + userPrincipal.getUsername() + " denied access to raw video " + rawVideoId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            System.out.println("Downloading raw video file from: " + rawVideo.getVideoUrl());
            byte[] fileContent = fileStorageService.downloadFile(rawVideo.getVideoUrl());

            if (fileContent == null || fileContent.length == 0) {
                System.out.println("File content is empty for raw video " + rawVideoId);
                return ResponseEntity.notFound().build();
            }

            String filename = rawVideo.getFilename() != null ? rawVideo.getFilename() : "raw-video.mp4";
            String contentType = getContentType(filename);

            return handleRangeRequest(request, fileContent, filename, contentType);

        } catch (IOException e) {
            System.err.println("Error streaming raw video " + rawVideoId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            System.err.println("Unexpected error streaming raw video " + rawVideoId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/revision/{revisionId}")
    public ResponseEntity<Resource> streamRevisionVideo(@PathVariable Long revisionId,
                                                        @CurrentUser UserPrincipal userPrincipal,
                                                        HttpServletRequest request) {
        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            System.out.println("Streaming revision video: " + revisionId + " by user: " + userPrincipal.getUsername());

            Revision revision = revisionService.getRevisionById(revisionId);
            if (!videoTaskService.canUserAccessTask(revision.getVideoTask().getId(), user)) {
                System.out.println("User " + userPrincipal.getUsername() + " denied access to revision " + revisionId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if (revision.getEditedVideoUrl() == null) {
                System.out.println("No edited video URL found for revision " + revisionId);
                return ResponseEntity.notFound().build();
            }

            System.out.println("Downloading revision file from: " + revision.getEditedVideoUrl());
            byte[] fileContent = fileStorageService.downloadFile(revision.getEditedVideoUrl());

            if (fileContent == null || fileContent.length == 0) {
                System.out.println("File content is empty for revision " + revisionId);
                return ResponseEntity.notFound().build();
            }

            String filename = revision.getEditedVideoFilename() != null ? revision.getEditedVideoFilename() : "revision.mp4";
            String contentType = getContentType(filename);

            return handleRangeRequest(request, fileContent, filename, contentType);

        } catch (IOException e) {
            System.err.println("Error streaming revision " + revisionId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            System.err.println("Unexpected error streaming revision " + revisionId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/audio/{audioId}")
    public ResponseEntity<Resource> streamAudio(@PathVariable Long audioId, @CurrentUser UserPrincipal userPrincipal) {
        try {
            System.out.println("Streaming audio: " + audioId + " by user: " + userPrincipal.getUsername());
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            AudioInstruction audio = audioInstructionRepository.findById(audioId)
                    .orElseThrow(() -> new RuntimeException("Audio not found"));

            if (!videoTaskService.canUserAccessTask(audio.getVideoTask().getId(), user)) {
                System.out.println("User " + userPrincipal.getUsername() + " denied access to audio " + audioId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if (audio.getAudioUrl() == null) {
                System.out.println("No audio URL found for audio " + audioId);
                return ResponseEntity.notFound().build();
            }

            System.out.println("Downloading audio file from: " + audio.getAudioUrl());
            byte[] fileContent = fileStorageService.downloadFile(audio.getAudioUrl());

            if (fileContent == null || fileContent.length == 0) {
                System.out.println("File content is empty for audio " + audioId);
                return ResponseEntity.notFound().build();
            }

            ByteArrayResource resource = new ByteArrayResource(fileContent);

            String filename = audio.getAudioFilename() != null ? audio.getAudioFilename() : "audio.mp3";
            String contentType = getAudioContentType(filename);

            System.out.println("Streaming audio: " + filename + " (" + fileContent.length + " bytes)");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(fileContent.length)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                    .body(resource);

        } catch (IOException e) {
            System.err.println("Error streaming audio " + audioId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            System.err.println("Unexpected error streaming audio " + audioId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Handle range requests for proper video streaming with audio
    private ResponseEntity<Resource> handleRangeRequest(HttpServletRequest request,
                                                        byte[] fileContent,
                                                        String filename,
                                                        String contentType) {
        long fileLength = fileContent.length;
        long start = 0;
        long end = fileLength - 1;

        String rangeHeader = request.getHeader("Range");

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            Pattern pattern = Pattern.compile("bytes=(\\d+)-(\\d*)");
            Matcher matcher = pattern.matcher(rangeHeader);

            if (matcher.matches()) {
                start = Long.parseLong(matcher.group(1));
                if (!matcher.group(2).isEmpty()) {
                    end = Long.parseLong(matcher.group(2));
                }
            }
        }

        // Ensure valid range
        if (start > end || start < 0 || end >= fileLength) {
            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileLength)
                    .build();
        }

        long contentLength = end - start + 1;
        byte[] rangeContent = new byte[(int) contentLength];
        System.arraycopy(fileContent, (int) start, rangeContent, 0, (int) contentLength);

        ByteArrayResource resource = new ByteArrayResource(rangeContent);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, contentType);
        headers.add(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength));
        headers.add(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.add(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength);
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"");
        headers.add(HttpHeaders.CACHE_CONTROL, "no-cache");

        // Important: Add CORS headers for video streaming
        headers.add("Access-Control-Allow-Origin", "http://localhost:3000");
        headers.add("Access-Control-Allow-Credentials", "true");
        headers.add("Access-Control-Allow-Headers", "Range, Content-Range, Content-Length");

        System.out.println("Streaming " + filename + " range: " + start + "-" + end + "/" + fileLength + " (" + contentLength + " bytes)");

        if (rangeHeader != null) {
            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .headers(headers)
                    .body(resource);
        } else {
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
        }
    }

    // Legacy download endpoint
    @GetMapping("/download/video/{taskId}")
    public ResponseEntity<Map<String, String>> downloadRawVideo(@PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        try {
            System.out.println("Downloading raw video for task: " + taskId + " by user: " + userPrincipal.getUsername());

            if (!videoTaskService.canUserDownloadTaskFiles(taskId, userPrincipal.getId())) {
                System.out.println("User " + userPrincipal.getUsername() + " denied download access to task " + taskId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoTask task = videoTaskService.getTaskById(taskId);
            if (task.getRawVideoUrl() == null) {
                return ResponseEntity.notFound().build();
            }

            String signedUrl = fileStorageService.getSignedUrlToDownload(task.getRawVideoUrl());

            Map<String, String> response = new HashMap<>();
            response.put("signedUrl", signedUrl);
            response.put("fileName", task.getRawVideoFilename());
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            System.err.println("Error downloading video for task " + taskId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // NEW: Download specific raw video
    @GetMapping("/download/raw-video/{rawVideoId}")
    public ResponseEntity<Map<String, String>> downloadSpecificRawVideo(@PathVariable Long rawVideoId, @CurrentUser UserPrincipal userPrincipal) {
        try {
            System.out.println("Downloading raw video: " + rawVideoId + " by user: " + userPrincipal.getUsername());

            RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                    .orElseThrow(() -> new RuntimeException("Raw video not found"));

            if (!videoTaskService.canUserDownloadTaskFiles(rawVideo.getVideoTask().getId(), userPrincipal.getId())) {
                System.out.println("User " + userPrincipal.getUsername() + " denied download access to raw video " + rawVideoId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String signedUrl = fileStorageService.getSignedUrlToDownload(rawVideo.getVideoUrl());

            Map<String, String> response = new HashMap<>();
            response.put("signedUrl", signedUrl);
            response.put("fileName", rawVideo.getFilename());
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            System.err.println("Error downloading raw video " + rawVideoId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/download/revision/{revisionId}")
    public ResponseEntity<Map<String, String>> downloadRevisionVideo(@PathVariable Long revisionId, @CurrentUser UserPrincipal userPrincipal) {
        try {
            System.out.println("Downloading revision video: " + revisionId + " by user: " + userPrincipal.getUsername());

            Revision revision = revisionService.getRevisionById(revisionId);
            if (!videoTaskService.canUserDownloadTaskFiles(revision.getVideoTask().getId(), userPrincipal.getId())) {
                System.out.println("User " + userPrincipal.getUsername() + " denied download access to revision " + revisionId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String signedUrl = fileStorageService.getSignedUrlToDownload(revision.getEditedVideoUrl());

            Map<String, String> response = new HashMap<>();
            response.put("signedUrl", signedUrl);
            response.put("fileName", revision.getEditedVideoFilename());
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            System.err.println("Error downloading revision " + revisionId + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String getContentType(String filename) {
        if (filename == null) return "video/mp4";

        String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        switch (extension) {
            case "mp4":
                return "video/mp4";
            case "mov":
                return "video/quicktime";
            case "avi":
                return "video/x-msvideo";
            case "mkv":
                return "video/x-matroska";
            case "wmv":
                return "video/x-ms-wmv";
            case "webm":
                return "video/webm";
            default:
                return "video/mp4";
        }
    }

    private String getAudioContentType(String filename) {
        if (filename == null) return "audio/mpeg";

        String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        switch (extension) {
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "m4a":
                return "audio/mp4";
            case "aac":
                return "audio/aac";
            case "ogg":
                return "audio/ogg";
            default:
                return "audio/mpeg";
        }
    }
}