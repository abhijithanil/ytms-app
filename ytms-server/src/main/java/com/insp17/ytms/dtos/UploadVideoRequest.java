package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UploadVideoRequest {
    private Long videoId;
    private Long channelId;
}
