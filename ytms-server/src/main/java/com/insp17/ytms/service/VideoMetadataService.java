package com.insp17.ytms.service;

import com.insp17.ytms.components.VideoMetadataMapper;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.entity.RawVideo;
import com.insp17.ytms.entity.Revision;
import com.insp17.ytms.entity.VideoMetadata;
import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.repository.RawVideoRepository;
import com.insp17.ytms.repository.RevisionRepository;
import com.insp17.ytms.repository.VideoMetadataRepository;
import com.insp17.ytms.repository.VideoTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VideoMetadataService {

    private final VideoMetadataRepository videoMetadataRepository;
    private final VideoTaskRepository videoTaskRepository;
    private final RevisionRepository revisionRepository;
    private final RawVideoRepository rawVideoRepository;

    @Autowired
    private VideoMetadataMapper videoMetadataMapper;

    // === TASK-LEVEL METADATA METHODS ===

    @Transactional
    public VideoMetadataDTO createOrUpdateVideoMetadata(Long taskId, VideoMetadataDTO metadataDTO) {
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
        videoMetadataMapper.updateEntity(metadata, metadataDTO);
        metadata.setVideoTask(videoTask);
        metadata.setRawVideo(null);
        metadata.setRevision(null);

        VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
        videoTask.setUpdatedAt(LocalDateTime.now());
        videoTaskRepository.save(videoTask);
        return videoMetadataMapper.toDTO(savedMetadata);
    }

    @Transactional(readOnly = true)
    public VideoMetadataDTO getVideoMetadata(Long taskId) {
        log.info("Retrieving video metadata for task ID: {}", taskId);
        VideoMetadata metadata = videoMetadataRepository.findByVideoTaskIdWithChapters(taskId)
                .orElseThrow(() -> new RuntimeException("Video metadata not found for task ID: " + taskId));
        return videoMetadataMapper.toDTO(metadata);
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
    public VideoMetadataDTO createOrUpdateRevisionMetadata(Long revisionId, VideoMetadataDTO metadataDTO) {
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
        metadata.setRevision(revision);
        metadata.setVideoTask(null);
        metadata.setRawVideo(null);

        log.info("Updating revision metadata for revision ID: {}", revisionId);
        videoMetadataMapper.updateEntity(metadata, metadataDTO);

        VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
        return videoMetadataMapper.toDTO(savedMetadata);
    }

    @Transactional(readOnly = true)
    public VideoMetadataDTO getRevisionMetadata(Long revisionId) {
        log.info("Retrieving revision metadata for revision ID: {}", revisionId);
        VideoMetadata metadata = videoMetadataRepository.findByRevisionIdWithChapters(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision metadata not found for revision ID: " + revisionId));
        return videoMetadataMapper.toDTO(metadata);
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
    public VideoMetadataDTO createOrUpdateRawVideoMetadata(Long rawVideoId, VideoMetadataDTO metadataDTO) {
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
        videoMetadataMapper.updateEntity(metadata, metadataDTO);
        metadata.setRawVideo(rawVideo);
        metadata.setVideoTask(null);
        metadata.setRevision(null);

        VideoMetadata savedMetadata = videoMetadataRepository.save(metadata);
        return videoMetadataMapper.toDTO(savedMetadata);
    }

    @Transactional(readOnly = true)
    public VideoMetadataDTO getRawVideoMetadata(Long rawVideoId) {
        log.info("Retrieving raw video metadata for raw video ID: {}", rawVideoId);
        VideoMetadata metadata = videoMetadataRepository.findByRawVideoIdWithChapters(rawVideoId)
                .orElseThrow(() -> new RuntimeException("Raw video metadata not found for raw video ID: " + rawVideoId));
        return videoMetadataMapper.toDTO(metadata);
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
    public Map<Long, VideoMetadataDTO> createOrUpdateMultipleRevisionMetadata(Map<Long, VideoMetadataDTO> metadataMap) {
        log.info("Creating/updating metadata for {} revisions", metadataMap.size());

        Map<Long, VideoMetadataDTO> results = new HashMap<>();

        for (Map.Entry<Long, VideoMetadataDTO> entry : metadataMap.entrySet()) {
            Long revisionId = entry.getKey();
            VideoMetadataDTO metadataDTO = entry.getValue();

            try {
                VideoMetadataDTO result = createOrUpdateRevisionMetadata(revisionId, metadataDTO);
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
    public Map<Long, VideoMetadataDTO> getMultipleRevisionMetadata(List<Long> revisionIds) {
        log.info("Retrieving metadata for {} revisions", revisionIds.size());

        List<VideoMetadata> metadataList = videoMetadataRepository.findByRevisionIdInWithChapters(revisionIds);

        return metadataList.stream()
                .collect(Collectors.toMap(
                        metadata -> metadata.getRevision().getId(),
                        metadata -> videoMetadataMapper.toDTO(metadata)
                ));
    }

    @Transactional(readOnly = true)
    public Map<Long, VideoMetadataDTO> getMultipleRawVideoMetadata(List<Long> rawVideoIds) {
        log.info("Retrieving metadata for {} raw videos", rawVideoIds.size());

        List<VideoMetadata> metadataList = videoMetadataRepository.findByRawVideoIdInWithChapters(rawVideoIds);

        return metadataList.stream()
                .collect(Collectors.toMap(
                        metadata -> metadata.getRawVideo().getId(),
                        metadata -> videoMetadataMapper.toDTO(metadata)
                ));
    }

    // === UTILITY METHODS ===

    @Transactional(readOnly = true)
    public List<VideoMetadataDTO> getAllMetadataForTask(Long taskId) {
        log.info("Retrieving all metadata for task ID: {}", taskId);

        List<VideoMetadata> allMetadata = videoMetadataRepository.findAllByVideoTaskIdWithChapters(taskId);

        return allMetadata.stream()
                .map(e -> videoMetadataMapper.toDTO(e))
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

    public Map<Long, VideoMetadataDTO> getAllRevisionMetadataForTask(Long taskId) {
        List<VideoMetadata> videoMetadata = videoMetadataRepository.findAllByVideoTaskIdWithChapters(taskId);

        return videoMetadata.stream()
                .collect(Collectors.toMap(
                        metadata -> metadata.getRevision().getId(),
                        metadata -> videoMetadataMapper.toDTO(metadata),
                        (existingValue, replacementValue) -> existingValue
                ));
    }


//    private VideoMetadataResponseDTO convertToResponseDTO(VideoMetadata metadata) {
//        VideoMetadataResponseDTO dto = new VideoMetadataResponseDTO();
//        dto.setId(metadata.getId());
//        dto.setTitle(metadata.getTitle());
//        dto.setDescription(metadata.getDescription());
//
//        if (metadata.getTags() != null) {
//            dto.setTags(metadata.getTags());
//        }
//
//        dto.setThumbnailUrl(metadata.getThumbnailUrl());
//        dto.setCategory(metadata.getCategory());
//        dto.setLanguage(metadata.getLanguage());
//        dto.setPrivacyStatus(metadata.getPrivacyStatus());
//        dto.setAgeRestriction(metadata.getAgeRestriction());
//        dto.setMadeForKids(metadata.getMadeForKids());
//        dto.setLicense(metadata.getLicense());
//
//        if (metadata.getLocationDescription() != null || metadata.getRecordingDate() != null) {
//            VideoMetadataDTO.RecordingDetailsDTO recordingDetails = new VideoMetadataDTO.RecordingDetailsDTO();
//            recordingDetails.setLocationDescription(metadata.getLocationDescription());
//            recordingDetails.setRecordingDate(metadata.getRecordingDate());
//            dto.setRecordingDetails(recordingDetails);
//        }
//
//        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
//            List<VideoChapterDTO> chapterDTOs = metadata.getVideoChapters().stream()
//                    .map(chapter -> new VideoChapterDTO(chapter.getTitle(), chapter.getTimestamp()))
//                    .collect(Collectors.toList());
//            dto.setVideoChapters(chapterDTOs);
//        }
//
//        return dto;
//    }


}