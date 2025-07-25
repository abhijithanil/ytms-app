package com.insp17.ytms.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoChapterDTO {
    @NotBlank(message = "Chapter title is required")
    @Size(max = 100, message = "Chapter title must not exceed 100 characters")
    private String title;

    @NotBlank(message = "Chapter timestamp is required")
    private String timestamp;

    private Integer order;

    @Override
    public String toString() {
        return title + " : " + timestamp;
    }
}