package com.insp17.ytms.repository;

import com.insp17.ytms.entity.VideoMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface VideoMetadataRepository extends JpaRepository<VideoMetadata, Long> {

    // Task-level metadata
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.videoTask.id = :taskId AND vm.revision IS NULL AND vm.rawVideo IS NULL")
    Optional<VideoMetadata> findByVideoTaskIdWithChapters(@Param("taskId") Long taskId);

    Optional<VideoMetadata> findByVideoTaskIdAndRevisionIsNullAndRawVideoIsNull(Long videoTaskId);

    boolean existsByVideoTaskId(Long videoTaskId);

    @Modifying
    @Transactional
    void deleteByVideoTaskId(Long videoTaskId);

    // Revision-specific metadata
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.revision.id = :revisionId")
    Optional<VideoMetadata> findByRevisionIdWithChapters(@Param("revisionId") Long revisionId);

    Optional<VideoMetadata> findByRevisionId(Long revisionId);

    boolean existsByRevisionId(Long revisionId);

    @Modifying
    @Transactional
    void deleteByRevisionId(Long revisionId);

    // Raw video-specific metadata
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.rawVideo.id = :rawVideoId")
    Optional<VideoMetadata> findByRawVideoIdWithChapters(@Param("rawVideoId") Long rawVideoId);

    Optional<VideoMetadata> findByRawVideoId(Long rawVideoId);

    boolean existsByRawVideoId(Long rawVideoId);

    @Modifying
    @Transactional
    void deleteByRawVideoId(Long rawVideoId);

    // Get all metadata for a task (including task-level, revision-specific, and raw video-specific)
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.videoTask.id = :taskId")
    List<VideoMetadata> findAllByVideoTaskIdWithChapters(@Param("taskId") Long taskId);

    // Find metadata by multiple revision IDs
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.revision.id IN :revisionIds")
    List<VideoMetadata> findByRevisionIdInWithChapters(@Param("revisionIds") List<Long> revisionIds);

    // Find metadata by multiple raw video IDs
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.rawVideo.id IN :rawVideoIds")
    List<VideoMetadata> findByRawVideoIdInWithChapters(@Param("rawVideoIds") List<Long> rawVideoIds);

    // Get metadata count for a task
    @Query("SELECT COUNT(vm) FROM VideoMetadata vm WHERE vm.videoTask.id = :taskId")
    long countByVideoTaskId(@Param("taskId") Long taskId);

    // Check if task has any metadata (task-level, revision-specific, or raw video-specific)
    @Query("SELECT CASE WHEN COUNT(vm) > 0 THEN true ELSE false END FROM VideoMetadata vm WHERE vm.videoTask.id = :taskId")
    boolean hasAnyMetadataForTask(@Param("taskId") Long taskId);
}