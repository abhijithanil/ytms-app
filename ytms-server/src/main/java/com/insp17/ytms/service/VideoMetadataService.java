package com.insp17.ytms.service;

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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VideoMetadataService {

    private final VideoMetadataRepository videoMetadataRepository;
    private final VideoTaskRepository videoTaskRepository;

    @Transactional
    public VideoMetadataResponseDTO createVideoMetadata(Long taskId, VideoMetadataDTO metadataDTO) {
        log.info("Creating video metadata for task ID: {}", taskId);

        VideoTask videoTask = videoTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Video task not found with ID: " + taskId));

        Optional<VideoMetadata> taskById = videoMetadataRepository.findByVideoTaskId(taskId);

        if (taskById.isPresent()) {
            return updateVideoMetadata(taskId, metadataDTO);
        } else {
            VideoMetadata metadata = convertToEntity(metadataDTO);
            metadata.setVideoTask(videoTask);
            if (metadataDTO.getVideoChapters() != null && !metadataDTO.getVideoChapters().isEmpty()) {
                List<VideoChapter> chapters = new ArrayList<>();
                IntStream.range(0, metadataDTO.getVideoChapters().size())
                        .forEach(i -> {
                            VideoMetadataDTO.VideoChapterDTO chapterDTO = metadataDTO.getVideoChapters().get(i);
                            VideoChapter chapter = new VideoChapter();
                            chapter.setTitle(chapterDTO.getTitle());
                            chapter.setTimestamp(chapterDTO.getTimestamp());
                            chapter.setOrder(i + 1);
                            chapter.setVideoMetadata(metadata);
                            chapters.add(chapter);
                        });
                metadata.setVideoChapters(chapters);
                VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
                return convertToResponseDTO(savedMetadata);

            } else {
                VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
                return convertToResponseDTO(savedMetadata);
            }
        }
    }

    @Transactional
    public VideoMetadataResponseDTO updateVideoMetadata(Long taskId, VideoMetadataDTO metadataDTO) {
        log.info("Updating video metadata for task ID: {}", taskId);

        VideoTask videoTask = videoTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Video task not found with ID: " + taskId));

        VideoMetadata existingMetadata = videoMetadataRepository.findByVideoTaskIdWithChapters(taskId)
                .orElseThrow(() -> new RuntimeException("Video metadata not found for task ID: " + taskId));

        // Update basic fields
        existingMetadata.setTitle(metadataDTO.getTitle());
        existingMetadata.setDescription(metadataDTO.getDescription());
        existingMetadata.setTags(metadataDTO.getTags());
        existingMetadata.setThumbnailUrl(metadataDTO.getThumbnailUrl());
        existingMetadata.setCategory(metadataDTO.getCategory());
        existingMetadata.setLanguage(metadataDTO.getLanguage());
        existingMetadata.setPrivacyStatus(metadataDTO.getPrivacyStatus());
        existingMetadata.setAgeRestriction(metadataDTO.getAgeRestriction());
        existingMetadata.setMadeForKids(metadataDTO.getMadeForKids());
        existingMetadata.setLicense(metadataDTO.getLicense());

        // Update recording details
        if (metadataDTO.getRecordingDetails() != null) {
            existingMetadata.setLocationDescription(metadataDTO.getRecordingDetails().getLocationDescription());
            existingMetadata.setRecordingDate(metadataDTO.getRecordingDetails().getRecordingDate());
        } else {
            existingMetadata.setLocationDescription(null);
            existingMetadata.setRecordingDate(null);
        }

        // Update video chapters
        existingMetadata.clearChapters();
        if (metadataDTO.getVideoChapters() != null && !metadataDTO.getVideoChapters().isEmpty()) {
            List<VideoChapter> newChapters = new ArrayList<>();
            IntStream.range(0, metadataDTO.getVideoChapters().size())
                    .forEach(i -> {
                        VideoMetadataDTO.VideoChapterDTO chapterDTO = metadataDTO.getVideoChapters().get(i);
                        VideoChapter chapter = new VideoChapter();
                        chapter.setTitle(chapterDTO.getTitle());
                        chapter.setTimestamp(chapterDTO.getTimestamp());
                        chapter.setOrder(i + 1);
                        chapter.setVideoMetadata(existingMetadata);
                        newChapters.add(chapter);
                    });
            existingMetadata.setVideoChapters(newChapters);
        }

        VideoMetadata savedMetadata = videoMetadataRepository.save(existingMetadata);
        return convertToResponseDTO(savedMetadata);
    }

    @Transactional(readOnly = true)
    public VideoMetadataResponseDTO getVideoMetadata(Long taskId) {
        log.info("Retrieving video metadata for task ID: {}", taskId);

        VideoMetadata metadata = videoMetadataRepository.findByVideoTaskId(taskId)
                .orElseThrow(() -> new RuntimeException("Video metadata not found for task ID: " + taskId));

        return convertToResponseDTO(metadata);
    }

    @Transactional
    public void deleteVideoMetadata(Long taskId) {
        log.info("Deleting video metadata for task ID: {}", taskId);

        VideoMetadata metadata = videoMetadataRepository.findByVideoTaskId(taskId)
                .orElseThrow(() -> new RuntimeException("Video metadata not found for task ID: " + taskId));

        videoMetadataRepository.delete(metadata);
        log.info("Successfully deleted video metadata for task ID: {}", taskId);
    }

    @Transactional(readOnly = true)
    public boolean hasVideoMetadata(Long taskId) {
        return videoMetadataRepository.existsByVideoTaskId(taskId);
    }

    private VideoMetadata convertToEntity(VideoMetadataDTO dto) {
        VideoMetadata metadata = new VideoMetadata();
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
        }

        return metadata;
    }

    private VideoMetadataResponseDTO convertToResponseDTO(VideoMetadata metadata) {
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

        // Set recording details
        if (metadata.getLocationDescription() != null || metadata.getRecordingDate() != null) {
            VideoMetadataDTO.RecordingDetailsDTO recordingDetails = new VideoMetadataDTO.RecordingDetailsDTO();
            recordingDetails.setLocationDescription(metadata.getLocationDescription());
            recordingDetails.setRecordingDate(metadata.getRecordingDate());
            dto.setRecordingDetails(recordingDetails);
        }

        // Set video chapters
        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
            List<VideoMetadataDTO.VideoChapterDTO> chapterDTOs = metadata.getVideoChapters().stream()
                    .map(chapter -> new VideoMetadataDTO.VideoChapterDTO(chapter.getTitle(), chapter.getTimestamp()))
                    .toList();
            dto.setVideoChapters(chapterDTOs);
        }

        return dto;
    }
}