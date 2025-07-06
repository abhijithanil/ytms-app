//package com.insp17.ytms.service.storage;
//
//import com.google.cloud.storage.*;
//import com.insp17.ytms.service.FileStorageService;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
//import org.springframework.stereotype.Service;
//import org.springframework.web.multipart.MultipartFile;
//
//import java.io.ByteArrayInputStream;
//import java.io.InputStream;
//import java.util.UUID;
//
//@Service
//@ConditionalOnProperty(name = "storage.provider", havingValue = "GCP")
//public class GCPStorageService implements FileStorageService {
//
//    private Storage storage;
//
//    @Value("${gcp.bucket.name}")
//    private String bucketName;
//
//    @PostConstruct
//    public void init() {
//        this.storage = StorageOptions.getDefaultInstance().getService();
//    }
//
//    @Override
//    public String uploadFile(MultipartFile file, String folder) throws Exception {
//        String fileName = generateFileName(file.getOriginalFilename());
//        String objectName = folder + "/" + fileName;
//
//        BlobId blobId = BlobId.of(bucketName, objectName);
//        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
//                .setContentType(file.getContentType())
//                .build();
//
//        storage.create(blobInfo, file.getBytes());
//        return objectName;
//    }
//
//    @Override
//    public InputStream downloadFile(String fileName) throws Exception {
//        Blob blob = storage.get(bucketName, fileName);
//        if (blob == null || !blob.exists()) {
//            throw new FileNotFoundException("File not found: " + fileName);
//        }
//        return new ByteArrayInputStream(blob.getContent());
//    }
//
//    @Override
//    public void deleteFile(String fileName) throws Exception {
//        storage.delete(bucketName, fileName);
//    }
//
//    @Override
//    public String getFileUrl(String fileName) {
//        return String.format("https://storage.googleapis.com/%s/%s", bucketName, fileName);
//    }
//
//    private String generateFileName(String originalFilename) {
//        String extension = "";
//        if (originalFilename != null && originalFilename.contains(".")) {
//            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
//        }
//        return UUID.randomUUID().toString() + extension;
//    }
//}
