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

    List<RawVideo> findByVideoTaskIdOrderByVideoOrderAsc(Long videoTaskId);

    List<RawVideo> findByVideoTaskIdOrderByCreatedAtAsc(Long videoTaskId);

    @Query("SELECT rv FROM RawVideo rv WHERE rv.videoTask.id = :taskId AND rv.id = :rawVideoId")
    Optional<RawVideo> findByTaskIdAndRawVideoId(@Param("taskId") Long taskId, @Param("rawVideoId") Long rawVideoId);

    @Query("SELECT COUNT(rv) FROM RawVideo rv WHERE rv.videoTask.id = :taskId")
    long countByVideoTaskId(@Param("taskId") Long taskId);

    @Query("SELECT MAX(rv.videoOrder) FROM RawVideo rv WHERE rv.videoTask.id = :taskId")
    Optional<Integer> findMaxVideoOrderByTaskId(@Param("taskId") Long taskId);

    void deleteByVideoTaskId(Long videoTaskId);
}