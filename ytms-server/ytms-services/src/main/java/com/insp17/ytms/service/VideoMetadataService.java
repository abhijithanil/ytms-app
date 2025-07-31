package com.insp17.ytms.service;

import com.insp17.ytms.components.VideoMetadataMapper;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.entity.Revision;
import com.insp17.ytms.entity.VideoMetadata;
import com.insp17.ytms.repository.RawVideoRepository;
import com.insp17.ytms.repository.RevisionRepository;
import com.insp17.ytms.repository.VideoMetadataRepository;
import com.insp17.ytms.repository.VideoTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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


    @Transactional
    public VideoMetadataDTO createOrUpdateRevisionMetadata(Long revisionId, VideoMetadataDTO metadataDTO) {
        Revision revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision not found with ID: " + revisionId));
        revision.getVideoTask();

        VideoMetadata metadata = videoMetadataRepository.findByRevisionIdWithChapters(revisionId)
                .orElseGet(() -> {
                    log.info("Creating new revision metadata for revision ID: {}", revisionId);
                    VideoMetadata newMetadata = new VideoMetadata();
                    newMetadata.setVideoTask(revision.getVideoTask());
                    newMetadata.setRevision(revision);
                    return newMetadata;
                });
        metadata.setRevision(revision);

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