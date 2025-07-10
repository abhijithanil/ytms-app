package com.insp17.ytms.service;

import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.storage.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;


@Service
public class FileStorageService {

    @Value("${deployed.at:GCP}")
    private String deploymentType;

    @Value("${gcp.bucket-name}")
    private String gcpBucketName;

    @Value("${file.storage.path:/mnt/storage/ytms}")
    private String internalStoragePath;

    @Value("${gcp.service-account-key-path}")
    private String serviceAccountKeyPath;

    private Storage storage = null;

    private static final long MAX_VIDEO_SIZE = 10L * 1024 * 1024 * 1024; // 10GB
    private static final long MAX_AUDIO_SIZE = 500L * 1024 * 1024; // 500MB

    public FileStorageService() {
    }

    @PostConstruct
    public void initGCPStorage() throws IOException {
        if (gcpBucketName == null) {
            System.err.println("Bucket name is not confugured properly");
            System.exit(1);
        }

        ServiceAccountCredentials credentials = ServiceAccountCredentials
                .fromStream(new FileInputStream(serviceAccountKeyPath));

        this.storage = StorageOptions.newBuilder()
                .setCredentials(credentials)
                .build()
                .getService();
    }

    public String generateResumableUploadUrl(String objectName, String contentType) throws StorageException {
        try {
            System.out.println("Generating RESUMABLE upload URL for: " + objectName);

            BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(gcpBucketName, objectName))
                    .setContentType(contentType)
                    .build();

            URL signedUrl = storage.signUrl(
                    blobInfo,
                    60,
                    TimeUnit.MINUTES,
                    Storage.SignUrlOption.httpMethod(HttpMethod.POST),
                    Storage.SignUrlOption.withV4Signature(),
                    Storage.SignUrlOption.withExtHeaders(Map.of(
                            "x-goog-resumable", "start"
                    ))
            );

            return signedUrl.toString();

        } catch (Exception e) {
            System.err.println("Error generating resumable upload URL: " + e.getMessage());
            e.printStackTrace();
            throw new StorageException(500, "Failed to generate resumable upload URL: " + e.getMessage());
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
            throw new IOException("Invalid video file extension. Supported: mp4, mov, avi, wmv, webm, flv, m4v");
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
        String[] validExtensions = {".mp4", ".mov", ".avi", ".wmv", ".webm", ".flv", ".m4v"};
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
            } catch (IOException ioException) {
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


    public String getSignedUrlToDownload(String gcsUrl) throws IOException {

        String objectName = getString(gcsUrl);

        URL signedUrl = storage.signUrl(
                BlobInfo.newBuilder(gcpBucketName, objectName).build(),
                60,
                TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.GET),
                Storage.SignUrlOption.withV4Signature()
        );

        return signedUrl.toString();
    }

    private static String getString(String gcsUrl) {
        if (!gcsUrl.startsWith("gs://")) {
            throw new IllegalArgumentException("Invalid GCS URL format. Expected gs://bucket-name/object-name");
        }

        String pathWithoutProtocol = gcsUrl.substring(5); // Remove "gs://"
        int firstSlashIndex = pathWithoutProtocol.indexOf('/');

        if (firstSlashIndex == -1) {
            throw new IllegalArgumentException("Invalid GCS URL format. Missing object name");
        }

        String objectName = pathWithoutProtocol.substring(firstSlashIndex + 1);
        return objectName;
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

    public String generateUniqueFilename(String originalFilename) {
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

    public String getGcpBucketName() {
        return gcpBucketName;
    }

    public String generateSignedUrlForDownload(String objectName) {
        try {
            BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(gcpBucketName, objectName)).build();

            URL signedUrl = storage.signUrl(
                    blobInfo,
                    15,
                    TimeUnit.MINUTES,
                    Storage.SignUrlOption.withV4Signature(),
                    Storage.SignUrlOption.httpMethod(HttpMethod.GET)
            );
            return signedUrl.toString();
        } catch (Exception e) {
            System.err.println("Error generating signed URL for " + objectName + ": " + e.getMessage());
            throw new RuntimeException("Could not generate signed URL", e);
        }
    }

    public byte[] downloadFile(String gcsUrl) throws IOException {
        String objectName = getString(gcsUrl);
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(gcpBucketName, objectName)).build();
        Blob blob = storage.get(blobInfo.getBlobId());

        // Check if the blob exists
        if (blob == null) {
            throw new IOException("File not found in GCS: " + gcsUrl);
        }

        // Download the file's content into a byte array
        return blob.getContent();
    }

    @Async("gcpDeleteTaskExecutor")
    public void deleteFileFromGCP(String videoUrl) {
        if (videoUrl == null) {
            return;
        }

        String objectName = getString(videoUrl);
        boolean deleted = storage.delete(gcpBucketName, objectName);

        if (!deleted) {
            System.err.println("Warning: GCP file not deleted (may not exist): " + videoUrl);
        } else {
            System.out.println("Deleted GCP object: " + videoUrl);
        }
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