package com.insp17.ytms.service;

import com.insp17.ytms.dtos.VideoChapterDTO;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.dtos.VideoMetadataResponseDTO;
import com.insp17.ytms.entity.VideoChapter;
import com.insp17.ytms.entity.VideoMetadata;
import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.repository.VideoMetadataRepository;
import com.insp17.ytms.repository.VideoTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VideoMetadataService {

    private final VideoMetadataRepository videoMetadataRepository;
    private final VideoTaskRepository videoTaskRepository;
    // NOTE: chapterRepository is no longer needed here due to cascading saves.

    @Transactional
    public VideoMetadataResponseDTO createOrUpdateVideoMetadata(Long taskId, VideoMetadataDTO metadataDTO) {
        // NOTE: Renamed method to be more descriptive of its "create or update" behavior.
        VideoTask videoTask = videoTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Video task not found with ID: " + taskId));

        // NOTE: Use a single method that fetches metadata with chapters to handle both cases.
        VideoMetadata metadata = videoMetadataRepository.findByVideoTaskIdWithChapters(taskId)
                .orElseGet(() -> {
                    log.info("Creating new video metadata for task ID: {}", taskId);
                    VideoMetadata newMetadata = new VideoMetadata();
                    newMetadata.setVideoTask(videoTask);
                    return newMetadata;
                });

        log.info("Updating video metadata for task ID: {}", taskId);
        updateEntityFromDTO(metadata, metadataDTO);

        VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
        videoTask.setUpdatedAt(LocalDateTime.now());
        videoTaskRepository.save(videoTask);
        return convertToResponseDTO(savedMetadata);
    }



    @Transactional(readOnly = true)
    public VideoMetadataResponseDTO getVideoMetadata(Long taskId) {
        log.info("Retrieving video metadata for task ID: {}", taskId);
        // NOTE: Use the query that fetches chapters to avoid LazyInitializationException
        VideoMetadata metadata = videoMetadataRepository.findByVideoTaskIdWithChapters(taskId)
                .orElseThrow(() -> new RuntimeException("Video metadata not found for task ID: " + taskId));
        return convertToResponseDTO(metadata);
    }

    @Transactional
    public void deleteVideoMetadata(Long taskId) {
        log.info("Deleting video metadata for task ID: {}", taskId);
        if (!videoMetadataRepository.existsByVideoTaskId(taskId)) {
            throw new RuntimeException("Video metadata not found for task ID: " + taskId);
        }
        videoMetadataRepository.deleteByVideoTaskId(taskId);
        log.info("Successfully deleted video metadata for task ID: {}", taskId);
    }

    @Transactional(readOnly = true)
    public boolean hasVideoMetadata(Long taskId) {
        return videoMetadataRepository.existsByVideoTaskId(taskId);
    }

    // NOTE: Centralized the logic for updating an entity from a DTO.
    private void updateEntityFromDTO(VideoMetadata metadata, VideoMetadataDTO dto) {
        metadata.setTitle(dto.getTitle());
        metadata.setDescription(dto.getDescription());
        metadata.setTags(dto.getTags());
        metadata.setThumbnailUrl(dto.getThumbnailUrl());
        metadata.setCategory(dto.getCategory());
        metadata.setLanguage(dto.getLanguage());
        metadata.setPrivacyStatus(dto.getPrivacyStatus());
        metadata.setAgeRestriction(dto.getAgeRestriction() != null ? dto.getAgeRestriction() : false);
        metadata.setMadeForKids(dto.getMadeForKids() != null ? dto.getMadeForKids() : false);
        metadata.setLicense(dto.getLicense() != null ? dto.getLicense() : "YouTube Standard License");

        if (dto.getRecordingDetails() != null) {
            metadata.setLocationDescription(dto.getRecordingDetails().getLocationDescription());
            metadata.setRecordingDate(dto.getRecordingDetails().getRecordingDate());
        } else {
            metadata.setLocationDescription(null);
            metadata.setRecordingDate(null);
        }

        // CHANGE: Simplified and corrected chapter update logic.
        // This clears the old collection and adds the new one.
        // CascadeType.ALL and orphanRemoval=true will handle deleting old chapters and saving new ones.
        metadata.getVideoChapters().clear();
        if (dto.getVideoChapters() != null && !dto.getVideoChapters().isEmpty()) {
            IntStream.range(0, dto.getVideoChapters().size())
                    .mapToObj(i -> {
                        VideoChapterDTO chapterDTO = dto.getVideoChapters().get(i);
                        VideoChapter chapter = new VideoChapter();
                        chapter.setTitle(chapterDTO.getTitle());
                        chapter.setTimestamp(chapterDTO.getTimestamp());
                        chapter.setOrder(i + 1);
                        return chapter;
                    })
                    .forEach(metadata::addChapter); // Use convenience method to set bidirectional relationship
        }
    }

    private VideoMetadataResponseDTO convertToResponseDTO(VideoMetadata metadata) {
        // ... (This method was mostly fine, no major changes needed but benefits from lazy loading fix)
        VideoMetadataResponseDTO dto = new VideoMetadataResponseDTO();
        dto.setId(metadata.getId());
        dto.setTitle(metadata.getTitle());
        dto.setDescription(metadata.getDescription());
        if (metadata.getTags() != null) {
            dto.setTags(metadata.getTags());
        }
        dto.setThumbnailUrl(metadata.getThumbnailUrl());
        dto.setCategory(metadata.getCategory());
        dto.setLanguage(metadata.getLanguage());
        dto.setPrivacyStatus(metadata.getPrivacyStatus());
        dto.setAgeRestriction(metadata.getAgeRestriction());
        dto.setMadeForKids(metadata.getMadeForKids());
        dto.setLicense(metadata.getLicense());

        if (metadata.getLocationDescription() != null || metadata.getRecordingDate() != null) {
            VideoMetadataDTO.RecordingDetailsDTO recordingDetails = new VideoMetadataDTO.RecordingDetailsDTO();
            recordingDetails.setLocationDescription(metadata.getLocationDescription());
            recordingDetails.setRecordingDate(metadata.getRecordingDate());
            dto.setRecordingDetails(recordingDetails);
        }

        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
            List<VideoChapterDTO> chapterDTOs = metadata.getVideoChapters().stream()
                    .map(chapter -> new VideoChapterDTO(chapter.getTitle(), chapter.getTimestamp()))
                    .collect(Collectors.toList()); // Use Collectors.toList() for broader compatibility
            dto.setVideoChapters(chapterDTOs);
        }

        return dto;
    }
}