package com.insp17.ytms.repository;

import com.insp17.ytms.entity.Revision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RevisionRepository extends JpaRepository<Revision, Long> {
    List<Revision> findByVideoTaskId(Long videoTaskId);
    List<Revision> findByVideoTaskIdOrderByRevisionNumberDesc(Long videoTaskId);
    List<Revision> findByUploadedById(Long uploadedById);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.revisionNumber = :revisionNumber")
    Optional<Revision> findByVideoTaskIdAndRevisionNumber(@Param("taskId") Long taskId, @Param("revisionNumber") Integer revisionNumber);

    @Query("SELECT MAX(r.revisionNumber) FROM Revision r WHERE r.videoTask.id = :taskId")
    Integer findMaxRevisionNumberByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestRevisionByTaskId(@Param("taskId") Long taskId);
}