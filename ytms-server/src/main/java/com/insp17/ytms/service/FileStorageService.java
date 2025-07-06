package com.insp17.ytms.service;

import com.google.cloud.storage.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${deployed.at:INTERNAL}")
    private String deploymentType;

    @Value("${gcp.bucket.name:ytms-bucket}")
    private String gcpBucketName;

    @Value("${file.storage.path:/mnt/storage/ytms}")
    private String internalStoragePath;

    private Storage storage = null;

    private static final long MAX_VIDEO_SIZE = 10L * 1024 * 1024 * 1024; // 10GB
    private static final long MAX_AUDIO_SIZE = 500L * 1024 * 1024; // 500MB

    public FileStorageService() {
        try {
            this.storage = StorageOptions.getDefaultInstance().getService();
        } catch (Exception e) {
            // If GCP is not configured, this will be null and we'll use internal storage
            System.out.println("GCP Storage not configured, using internal storage only");
        }
    }

    public FileUploadResult uploadVideo(MultipartFile file, String folder) throws IOException {
        validateVideoFile(file);
        String filename = generateUniqueFilename(file.getOriginalFilename());
        String filePath = folder + "/" + filename;

        if ("GCP".equals(deploymentType) && storage != null) {
            return uploadToGCP(file, filePath);
        } else {
            return uploadToInternal(file, filePath);
        }
    }

    public FileUploadResult uploadAudio(MultipartFile file, String folder) throws IOException {
        validateAudioFile(file);
        String filename = generateUniqueFilename(file.getOriginalFilename());
        String filePath = folder + "/" + filename;

        if ("GCP".equals(deploymentType) && storage != null) {
            return uploadToGCP(file, filePath);
        } else {
            return uploadToInternal(file, filePath);
        }
    }

    private void validateVideoFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("File is empty");
        }

        if (file.getSize() > MAX_VIDEO_SIZE) {
            throw new IOException("Video file size exceeds maximum limit of 10GB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("application/")) {
            throw new IOException("File must be a video file");
        }

        // Check file extension
        String filename = file.getOriginalFilename();
        if (filename == null || !isValidVideoExtension(filename)) {
            throw new IOException("Invalid video file extension. Supported: mp4, mov, avi, mkv, wmv, webm, flv, m4v");
        }
    }

    private void validateAudioFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("File is empty");
        }

        if (file.getSize() > MAX_AUDIO_SIZE) {
            throw new IOException("Audio file size exceeds maximum limit of 500MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("audio/")) {
            throw new IOException("File must be an audio file");
        }

        // Check file extension
        String filename = file.getOriginalFilename();
        if (filename == null || !isValidAudioExtension(filename)) {
            throw new IOException("Invalid audio file extension. Supported: mp3, wav, m4a, aac, ogg, flac");
        }
    }

    private boolean isValidVideoExtension(String filename) {
        String[] validExtensions = {".mp4", ".mov", ".avi", ".mkv", ".wmv", ".webm", ".flv", ".m4v"};
        String lowerFilename = filename.toLowerCase();
        for (String ext : validExtensions) {
            if (lowerFilename.endsWith(ext)) {
                return true;
            }
        }
        return false;
    }

    private boolean isValidAudioExtension(String filename) {
        String[] validExtensions = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"};
        String lowerFilename = filename.toLowerCase();
        for (String ext : validExtensions) {
            if (lowerFilename.endsWith(ext)) {
                return true;
            }
        }
        return false;
    }

    private FileUploadResult uploadToGCP(MultipartFile file, String filePath) throws IOException {
        if (storage == null) {
            throw new IOException("GCP Storage is not configured");
        }

        BlobId blobId = BlobId.of(gcpBucketName, filePath);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType())
                .build();

        // Upload the file
        Blob blob = storage.create(blobInfo, file.getBytes());

        String url = String.format("gs://%s/%s", gcpBucketName, filePath);
        return new FileUploadResult(url, file.getOriginalFilename(), file.getSize());
    }

    private FileUploadResult uploadToInternal(MultipartFile file, String filePath) throws IOException {
        Path uploadPath = Paths.get(internalStoragePath);
        if (!Files.exists(uploadPath)) {
            try {
                Files.createDirectories(uploadPath);
            } catch (IOException ioException){
                ioException.printStackTrace();
            }
        }

        Path fullPath = uploadPath.resolve(filePath);
        Files.createDirectories(fullPath.getParent());

        // Use streaming copy for large files to avoid memory issues
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, fullPath, StandardCopyOption.REPLACE_EXISTING);
        }

        String url = "/files/" + filePath;
        return new FileUploadResult(url, file.getOriginalFilename(), file.getSize());
    }

    public InputStream downloadFileAsStream(String filePath) throws IOException {
        if ("GCP".equals(deploymentType) && storage != null) {
            return downloadStreamFromGCP(filePath);
        } else {
            return downloadStreamFromInternal(filePath);
        }
    }

    public byte[] downloadFile(String filePath) throws IOException {
        if ("GCP".equals(deploymentType) && storage != null) {
            return downloadFromGCP(filePath);
        } else {
            return downloadFromInternal(filePath);
        }
    }

    private byte[] downloadFromGCP(String filePath) {
        if (storage == null) {
            throw new RuntimeException("GCP Storage is not configured");
        }

        String objectName = filePath.replace("gs://" + gcpBucketName + "/", "");
        Blob blob = storage.get(gcpBucketName, objectName);

        if (blob == null) {
            throw new RuntimeException("File not found: " + filePath);
        }

        return blob.getContent();
    }

    private InputStream downloadStreamFromGCP(String filePath) throws IOException {
        if (storage == null) {
            throw new IOException("GCP Storage is not configured");
        }

        String objectName = filePath.replace("gs://" + gcpBucketName + "/", "");
        Blob blob = storage.get(gcpBucketName, objectName);

        if (blob == null) {
            throw new IOException("File not found: " + filePath);
        }

        // For large files, use getContent() and wrap in ByteArrayInputStream
        // For production, you might want to use blob.reader() for streaming
        byte[] content = blob.getContent();
        return new ByteArrayInputStream(content);
    }

    private byte[] downloadFromInternal(String filePath) throws IOException {
        String objectPath = filePath.replace("/files/", "");
        Path fullPath = Paths.get(internalStoragePath, objectPath);

        if (!Files.exists(fullPath)) {
            throw new IOException("File not found: " + filePath);
        }

        return Files.readAllBytes(fullPath);
    }

    private InputStream downloadStreamFromInternal(String filePath) throws IOException {
        String objectPath = filePath.replace("/files/", "");
        Path fullPath = Paths.get(internalStoragePath, objectPath);

        if (!Files.exists(fullPath)) {
            throw new IOException("File not found: " + filePath);
        }

        return Files.newInputStream(fullPath);
    }

    public void deleteFile(String filePath) throws IOException {
        if ("GCP".equals(deploymentType) && storage != null) {
            deleteFromGCP(filePath);
        } else {
            deleteFromInternal(filePath);
        }
    }

    private void deleteFromGCP(String filePath) {
        if (storage == null) {
            throw new RuntimeException("GCP Storage is not configured");
        }

        String objectName = filePath.replace("gs://" + gcpBucketName + "/", "");
        boolean deleted = storage.delete(gcpBucketName, objectName);

        if (!deleted) {
            System.out.println("Warning: File may not have been deleted: " + filePath);
        }
    }

    private void deleteFromInternal(String filePath) throws IOException {
        String objectPath = filePath.replace("/files/", "");
        Path fullPath = Paths.get(internalStoragePath, objectPath);
        Files.deleteIfExists(fullPath);
    }

    private String generateUniqueFilename(String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String extension = getFileExtension(originalFilename);
        return timestamp + "_" + uuid + extension;
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf('.') == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.'));
    }

    public long getMaxVideoSize() {
        return MAX_VIDEO_SIZE;
    }

    public long getMaxAudioSize() {
        return MAX_AUDIO_SIZE;
    }

    public String getMaxVideoSizeFormatted() {
        return "10GB";
    }

    public String getMaxAudioSizeFormatted() {
        return "500MB";
    }

    public boolean isGcpConfigured() {
        return storage != null && "GCP".equals(deploymentType);
    }

    public String getStorageType() {
        return isGcpConfigured() ? "GCP" : "INTERNAL";
    }

    public static class FileUploadResult {
        private final String url;
        private final String originalFilename;
        private final long size;

        public FileUploadResult(String url, String originalFilename, long size) {
            this.url = url;
            this.originalFilename = originalFilename;
            this.size = size;
        }

        public String getUrl() {
            return url;
        }

        public String getOriginalFilename() {
            return originalFilename;
        }

        public long getSize() {
            return size;
        }
    }
}