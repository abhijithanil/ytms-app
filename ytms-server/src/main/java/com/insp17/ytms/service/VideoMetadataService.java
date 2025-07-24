package com.insp17.ytms.service;

import com.insp17.ytms.dtos.VideoChapterDTO;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.dtos.VideoMetadataResponseDTO;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.VideoMetadataRepository;
import com.insp17.ytms.repository.VideoTaskRepository;
import com.insp17.ytms.repository.RevisionRepository;
import com.insp17.ytms.repository.RawVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VideoMetadataService {

    private final VideoMetadataRepository videoMetadataRepository;
    private final VideoTaskRepository videoTaskRepository;
    private final RevisionRepository revisionRepository;
    private final RawVideoRepository rawVideoRepository;

    // === TASK-LEVEL METADATA METHODS ===

    @Transactional
    public VideoMetadataResponseDTO createOrUpdateVideoMetadata(Long taskId, VideoMetadataDTO metadataDTO) {
        VideoTask videoTask = videoTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Video task not found with ID: " + taskId));

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

    // === REVISION-SPECIFIC METADATA METHODS ===

    @Transactional
    public VideoMetadataResponseDTO createOrUpdateRevisionMetadata(Long revisionId, VideoMetadataDTO metadataDTO) {
        Revision revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision not found with ID: " + revisionId));

        VideoMetadata metadata = videoMetadataRepository.findByRevisionIdWithChapters(revisionId)
                .orElseGet(() -> {
                    log.info("Creating new revision metadata for revision ID: {}", revisionId);
                    VideoMetadata newMetadata = new VideoMetadata();
                    newMetadata.setVideoTask(revision.getVideoTask());
                    newMetadata.setRevision(revision);
                    return newMetadata;
                });

        log.info("Updating revision metadata for revision ID: {}", revisionId);
        updateEntityFromDTO(metadata, metadataDTO);

        VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
        return convertToResponseDTO(savedMetadata);
    }

    @Transactional(readOnly = true)
    public VideoMetadataResponseDTO getRevisionMetadata(Long revisionId) {
        log.info("Retrieving revision metadata for revision ID: {}", revisionId);
        VideoMetadata metadata = videoMetadataRepository.findByRevisionIdWithChapters(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision metadata not found for revision ID: " + revisionId));
        return convertToResponseDTO(metadata);
    }

    @Transactional
    public void deleteRevisionMetadata(Long revisionId) {
        log.info("Deleting revision metadata for revision ID: {}", revisionId);
        if (!videoMetadataRepository.existsByRevisionId(revisionId)) {
            throw new RuntimeException("Revision metadata not found for revision ID: " + revisionId);
        }
        videoMetadataRepository.deleteByRevisionId(revisionId);
        log.info("Successfully deleted revision metadata for revision ID: {}", revisionId);
    }

    @Transactional(readOnly = true)
    public boolean hasRevisionMetadata(Long revisionId) {
        return videoMetadataRepository.existsByRevisionId(revisionId);
    }

    // === RAW VIDEO-SPECIFIC METADATA METHODS ===

    @Transactional
    public VideoMetadataResponseDTO createOrUpdateRawVideoMetadata(Long rawVideoId, VideoMetadataDTO metadataDTO) {
        RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                .orElseThrow(() -> new RuntimeException("Raw video not found with ID: " + rawVideoId));

        VideoMetadata metadata = videoMetadataRepository.findByRawVideoIdWithChapters(rawVideoId)
                .orElseGet(() -> {
                    log.info("Creating new raw video metadata for raw video ID: {}", rawVideoId);
                    VideoMetadata newMetadata = new VideoMetadata();
                    newMetadata.setVideoTask(rawVideo.getVideoTask());
                    newMetadata.setRawVideo(rawVideo);
                    return newMetadata;
                });

        log.info("Updating raw video metadata for raw video ID: {}", rawVideoId);
        updateEntityFromDTO(metadata, metadataDTO);

        VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
        return convertToResponseDTO(savedMetadata);
    }

    @Transactional(readOnly = true)
    public VideoMetadataResponseDTO getRawVideoMetadata(Long rawVideoId) {
        log.info("Retrieving raw video metadata for raw video ID: {}", rawVideoId);
        VideoMetadata metadata = videoMetadataRepository.findByRawVideoIdWithChapters(rawVideoId)
                .orElseThrow(() -> new RuntimeException("Raw video metadata not found for raw video ID: " + rawVideoId));
        return convertToResponseDTO(metadata);
    }

    @Transactional
    public void deleteRawVideoMetadata(Long rawVideoId) {
        log.info("Deleting raw video metadata for raw video ID: {}", rawVideoId);
        if (!videoMetadataRepository.existsByRawVideoId(rawVideoId)) {
            throw new RuntimeException("Raw video metadata not found for raw video ID: " + rawVideoId);
        }
        videoMetadataRepository.deleteByRawVideoId(rawVideoId);
        log.info("Successfully deleted raw video metadata for raw video ID: {}", rawVideoId);
    }

    @Transactional(readOnly = true)
    public boolean hasRawVideoMetadata(Long rawVideoId) {
        return videoMetadataRepository.existsByRawVideoId(rawVideoId);
    }

    // === MULTI-VIDEO METADATA METHODS ===

    @Transactional
    public Map<Long, VideoMetadataResponseDTO> createOrUpdateMultipleRevisionMetadata(Map<Long, VideoMetadataDTO> metadataMap) {
        log.info("Creating/updating metadata for {} revisions", metadataMap.size());

        Map<Long, VideoMetadataResponseDTO> results = new HashMap<>();

        for (Map.Entry<Long, VideoMetadataDTO> entry : metadataMap.entrySet()) {
            Long revisionId = entry.getKey();
            VideoMetadataDTO metadataDTO = entry.getValue();

            try {
                VideoMetadataResponseDTO result = createOrUpdateRevisionMetadata(revisionId, metadataDTO);
                results.put(revisionId, result);
                log.info("Successfully processed metadata for revision ID: {}", revisionId);
            } catch (Exception e) {
                log.error("Failed to process metadata for revision ID: {}", revisionId, e);
                throw new RuntimeException("Failed to process metadata for revision " + revisionId + ": " + e.getMessage());
            }
        }

        return results;
    }

    @Transactional(readOnly = true)
    public Map<Long, VideoMetadataResponseDTO> getMultipleRevisionMetadata(List<Long> revisionIds) {
        log.info("Retrieving metadata for {} revisions", revisionIds.size());

        List<VideoMetadata> metadataList = videoMetadataRepository.findByRevisionIdInWithChapters(revisionIds);

        return metadataList.stream()
                .collect(Collectors.toMap(
                        metadata -> metadata.getRevision().getId(),
                        this::convertToResponseDTO
                ));
    }

    @Transactional(readOnly = true)
    public Map<Long, VideoMetadataResponseDTO> getMultipleRawVideoMetadata(List<Long> rawVideoIds) {
        log.info("Retrieving metadata for {} raw videos", rawVideoIds.size());

        List<VideoMetadata> metadataList = videoMetadataRepository.findByRawVideoIdInWithChapters(rawVideoIds);

        return metadataList.stream()
                .collect(Collectors.toMap(
                        metadata -> metadata.getRawVideo().getId(),
                        this::convertToResponseDTO
                ));
    }

    // === UTILITY METHODS ===

    @Transactional(readOnly = true)
    public List<VideoMetadataResponseDTO> getAllMetadataForTask(Long taskId) {
        log.info("Retrieving all metadata for task ID: {}", taskId);

        List<VideoMetadata> allMetadata = videoMetadataRepository.findAllByVideoTaskIdWithChapters(taskId);

        return allMetadata.stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean hasAnyMetadataForTask(Long taskId) {
        return videoMetadataRepository.hasAnyMetadataForTask(taskId);
    }

    @Transactional(readOnly = true)
    public long getMetadataCountForTask(Long taskId) {
        return videoMetadataRepository.countByVideoTaskId(taskId);
    }

    // === PRIVATE HELPER METHODS ===

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

        // Handle video type and shorts-specific data
        if (metadata.getRevision() != null) {
            String revisionType = metadata.getRevision().getType();
            if ("short".equals(revisionType)) {
                metadata.setVideoType(VideoType.SHORT);
                metadata.setIsShort(true);
            } else {
                metadata.setVideoType(VideoType.MAIN);
                metadata.setIsShort(false);
            }
        } else if (metadata.getRawVideo() != null) {
            String rawVideoType = metadata.getRawVideo().getType();
            if ("short".equals(rawVideoType)) {
                metadata.setVideoType(VideoType.SHORT);
                metadata.setIsShort(true);
            } else {
                metadata.setVideoType(VideoType.MAIN);
                metadata.setIsShort(false);
            }
        }

        // Chapter update logic
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
                    .forEach(metadata::addChapter);
        }
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

        if (metadata.getLocationDescription() != null || metadata.getRecordingDate() != null) {
            VideoMetadataDTO.RecordingDetailsDTO recordingDetails = new VideoMetadataDTO.RecordingDetailsDTO();
            recordingDetails.setLocationDescription(metadata.getLocationDescription());
            recordingDetails.setRecordingDate(metadata.getRecordingDate());
            dto.setRecordingDetails(recordingDetails);
        }

        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
            List<VideoChapterDTO> chapterDTOs = metadata.getVideoChapters().stream()
                    .map(chapter -> new VideoChapterDTO(chapter.getTitle(), chapter.getTimestamp()))
                    .collect(Collectors.toList());
            dto.setVideoChapters(chapterDTOs);
        }

        return dto;
    }
}