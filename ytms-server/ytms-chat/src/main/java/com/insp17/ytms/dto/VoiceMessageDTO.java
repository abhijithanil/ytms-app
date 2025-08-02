package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VoiceMessageDTO {
    private String audioUrl;
    private Integer duration; // in seconds
    private String waveformData; // JSON array of waveform points
    private Boolean isPlaying;
    private Integer currentPosition;
    private String transcription; // Optional auto-generated transcription
}
