package com.insp17.ytms.dtos;

public class FileUploadResponse {
    private String fileName;
    private String fileUrl;
    private String originalFilename;

    public FileUploadResponse(String fileName, String fileUrl, String originalFilename) {
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.originalFilename = originalFilename;
    }

    public FileUploadResponse(String fileName, String fileUrl, String originalFilename, String error) {
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.originalFilename = originalFilename;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }
}
