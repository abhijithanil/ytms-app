package com.insp17.ytms.repository;

import com.insp17.ytms.entity.RawVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RawVideoRepository extends JpaRepository<RawVideo, Long> {

    List<RawVideo> findByVideoTaskId(Long videoTaskId);

    List<RawVideo> findByVideoTaskIdOrderByCreatedAtAsc(Long videoTaskId);

    List<RawVideo> findByVideoTaskIdAndType(Long videoTaskId, String type);

    Optional<RawVideo> findByVideoTaskIdAndId(Long videoTaskId, Long id);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = :type ORDER BY rv.createdAt ASC")
    List<RawVideo> findByTaskIdAndTypeOrderByCreatedAt(@Param("taskId") Long taskId, @Param("type") String type);

    @Query("SELECT COUNT(rv) FROM RawVideo rv WHERE rv.videoTask.id = :taskId")
    long countByVideoTaskId(@Param("taskId") Long taskId);

    @Query("SELECT COUNT(rv) FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = :type")
    long countByVideoTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    void deleteByVideoTaskId(Long videoTaskId);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = 'main' ORDER BY rv.createdAt ASC LIMIT 1")
    Optional<RawVideo> findFirstMainVideoByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.type = 'short' ORDER BY rv.createdAt ASC")
    List<RawVideo> findShortVideosByTaskId(@Param("taskId") Long taskId);
}