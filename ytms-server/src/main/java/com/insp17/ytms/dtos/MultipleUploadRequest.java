package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MultipleUploadRequest {
    private List<VideoUploadItem> videosToUpload;
}
