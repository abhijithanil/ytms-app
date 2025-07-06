//package com.insp17.ytms.service.storage;
//
//import com.insp17.ytms.service.FileStorageService;
//import jakarta.annotation.PostConstruct;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
//import org.springframework.stereotype.Service;
//import org.springframework.web.multipart.MultipartFile;
//
//import java.io.IOException;
//import java.io.InputStream;
//import java.nio.file.Files;
//import java.nio.file.Path;
//import java.nio.file.Paths;
//import java.nio.file.StandardCopyOption;
//import java.util.UUID;
//
//@Service
//@ConditionalOnProperty(name = "storage.provider", havingValue = "LOCAL", matchIfMissing = true)
//public class LocalFileStorageService implements FileStorageService {
//
//    @Value("${file.upload.dir:/opt/ytms/uploads}")
//    private String uploadDir;
//
//    @PostConstruct
//    public void init() {
//        try {
//            Files.createDirectories(Paths.get(uploadDir));
//        } catch (IOException e) {
//            throw new RuntimeException("Could not create upload directory!", e);
//        }
//    }
//
//    @Override
//    public String uploadFile(MultipartFile file, String folder) throws Exception {
//        String fileName = generateFileName(file.getOriginalFilename());
//        Path folderPath = Paths.get(uploadDir, folder);
//        Files.createDirectories(folderPath);
//
//        Path filePath = folderPath.resolve(fileName);
//        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
//
//        return folder + "/" + fileName;
//    }
//
//    @Override
//    public InputStream downloadFile(String fileName) throws Exception {
//        Path filePath = Paths.get(uploadDir, fileName);
//        return Files.newInputStream(filePath);
//    }
//
//    @Override
//    public void deleteFile(String fileName) throws Exception {
//        Path filePath = Paths.get(uploadDir, fileName);
//        Files.deleteIfExists(filePath);
//    }
//
//    @Override
//    public String getFileUrl(String fileName) {
//        return "/api/files/stream/" + fileName;
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
