package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VideoChapterWithSeconds {
    VideoChapterDTO chapter;
    int seconds;
}
