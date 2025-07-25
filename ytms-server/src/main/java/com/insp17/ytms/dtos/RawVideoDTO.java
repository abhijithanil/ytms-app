package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.RawVideo;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RawVideoDTO {
    private Long id;
    private String filename;
    private String url;
    private String type; // "main" or "short"
    private Long size;
    private Long videoTaskId;

    public RawVideoDTO() {
    }

    public RawVideoDTO(RawVideo rawVideo) {
        this.id = rawVideo.getId();
        this.filename = rawVideo.getFilename();
        this.url = rawVideo.getUrl();
        this.type = rawVideo.getType();
        this.size = rawVideo.getSize();
        this.videoTaskId = rawVideo.getVideoTask().getId();
    }
}