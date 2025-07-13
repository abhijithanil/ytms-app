package com.insp17.ytms.repository;

import com.insp17.ytms.entity.VideoMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
//public interface VideoMetadataRepository extends JpaRepository<VideoMetadata, Long> {
//
//    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.videoTask.id = :taskId")
//    Optional<VideoMetadata> findByVideoTaskIdWithChapters(@Param("taskId") Long taskId);
//
//    @Query("SELECT vm FROM VideoMetadata vm WHERE vm.videoTask.id = :taskId")
//    Optional<VideoMetadata> findByVideoTaskId(@Param("taskId") Long taskId);
//
//    boolean existsByVideoTaskId(Long taskId);
//}

public interface VideoMetadataRepository extends JpaRepository<VideoMetadata, Long> {

    // Add this method to eagerly fetch chapters when needed
    @Query("SELECT vm FROM VideoMetadata vm LEFT JOIN FETCH vm.videoChapters WHERE vm.videoTask.id = :taskId")
    Optional<VideoMetadata> findByVideoTaskIdWithChapters(@Param("taskId") Long taskId);

    // Keep this one for simple checks
    Optional<VideoMetadata> findByVideoTaskId(Long taskId);

    boolean existsByVideoTaskId(Long taskId);

    void deleteByVideoTaskId(Long taskId);
}