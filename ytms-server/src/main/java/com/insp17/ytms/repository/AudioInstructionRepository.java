package com.insp17.ytms.repository;

import com.insp17.ytms.entity.AudioInstruction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AudioInstructionRepository extends JpaRepository<AudioInstruction, Long> {
    List<AudioInstruction> findByVideoTaskId(Long videoTaskId);
    List<AudioInstruction> findByVideoTaskIdOrderByCreatedAtDesc(Long videoTaskId);
    List<AudioInstruction> findByUploadedById(Long uploadedById);

    @Query("SELECT ai FROM AudioInstruction ai WHERE ai.videoTask.id = :taskId ORDER BY ai.createdAt ASC")
    List<AudioInstruction> findByVideoTaskIdOrderByCreatedAtAsc(@Param("taskId") Long taskId);
}
