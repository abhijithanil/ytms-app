package com.insp17.ytms.repository;

import com.insp17.ytms.entity.RawVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RawVideoRepository extends JpaRepository<RawVideo, Long> {

    List<RawVideo> findByVideoTaskIdOrderByCreatedAtAsc(Long videoTaskId);

    List<RawVideo> findByVideoTaskIdAndType(Long videoTaskId, String type);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = 'main' ORDER BY rv.createdAt ASC")
    List<RawVideo> findMainVideosByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = 'short' ORDER BY rv.createdAt ASC")
    List<RawVideo> findShortVideosByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = 'main' ORDER BY rv.createdAt ASC LIMIT 1")
    Optional<RawVideo> findFirstMainVideoByTaskId(@Param("taskId") Long taskId);

    long countByVideoTaskId(Long videoTaskId);

    long countByVideoTaskIdAndType(Long videoTaskId, String type);

    @Modifying
    @Query("DELETE FROM RawVideo rv WHERE rv.videoTask.id = :taskId")
    void deleteByVideoTaskId(@Param("taskId") Long taskId);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.id = :videoId AND rv.videoTask.id = :taskId")
    Optional<RawVideo> findByIdAndVideoTaskId(@Param("videoId") Long videoId, @Param("taskId") Long taskId);
}