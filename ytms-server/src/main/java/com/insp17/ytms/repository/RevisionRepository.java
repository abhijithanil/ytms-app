package com.insp17.ytms.repository;

import com.insp17.ytms.entity.Revision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    // NEW: Find revisions by task and type
    List<Revision> findByVideoTaskIdAndType(Long videoTaskId, String type);

    List<Revision> findByVideoTaskIdAndTypeOrderByRevisionNumberDesc(Long videoTaskId, String type);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.revisionNumber = :revisionNumber")
    Optional<Revision> findByVideoTaskIdAndRevisionNumber(@Param("taskId") Long taskId, @Param("revisionNumber") Integer revisionNumber);

    @Query("SELECT MAX(r.revisionNumber) FROM Revision r WHERE r.videoTask.id = :taskId")
    Integer findMaxRevisionNumberByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestRevisionByTaskId(@Param("taskId") Long taskId);

    // NEW: Find latest revision by task and type
    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = :type ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestRevisionByTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    // NEW: Count revisions by type
    @Query("SELECT COUNT(r) FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = :type")
    long countByVideoTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    // NEW: Find main video revisions
    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = 'main' ORDER BY r.revisionNumber DESC")
    List<Revision> findMainRevisionsByTaskId(@Param("taskId") Long taskId);

    // NEW: Find short video revisions
    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = 'short' ORDER BY r.revisionNumber DESC")
    List<Revision> findShortRevisionsByTaskId(@Param("taskId") Long taskId);

    // NEW: Find revisions suitable for YouTube upload (both main and short)
    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.type IN ('main', 'short') ORDER BY r.type DESC, r.revisionNumber DESC")
    List<Revision> findYouTubeReadyRevisionsByTaskId(@Param("taskId") Long taskId);

    // NEW: Find latest main revision
    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = 'main' ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestMainRevisionByTaskId(@Param("taskId") Long taskId);

    // NEW: Find latest short revision
    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = 'short' ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestShortRevisionByTaskId(@Param("taskId") Long taskId);

    // NEW: Check if task has any revisions of specific type
    @Query("SELECT COUNT(r) > 0 FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = :type")
    boolean existsByVideoTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    // NEW: Get revision statistics by task
    @Query("SELECT r.type, COUNT(r) FROM Revision r WHERE r.videoTask.id = :taskId GROUP BY r.type")
    List<Object[]> getRevisionStatsByTaskId(@Param("taskId") Long taskId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Revision r WHERE r.id = :id")
    int deleteByIdNativeSql(@Param("id") Long id);

    // NEW: Delete all revisions of specific type for a task
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Revision r WHERE r.videoTask.id = :taskId AND r.type = :type")
    int deleteByVideoTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);
}