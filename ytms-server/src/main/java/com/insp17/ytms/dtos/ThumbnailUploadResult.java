package com.insp17.ytms.dtos;

public class ThumbnailUploadResult {

    private String publicUrl;
    private String filename;
    private long size;

    public ThumbnailUploadResult(String publicUrl, String filename, long size) {
        this.filename = filename;
        this.publicUrl = publicUrl;
        this.size = size;
    }

    public String getPublicUrl() {
        return publicUrl;
    }

    public void setPublicUrl(String publicUrl) {
        this.publicUrl = publicUrl;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }
}
