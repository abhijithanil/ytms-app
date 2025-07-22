package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.VideoChapter;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VideoChapterWithSeconds {
    VideoChapterDTO chapter;
    int seconds;
}
