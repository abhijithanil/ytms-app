package com.insp17.ytms.repository;

import com.insp17.ytms.entity.Revision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface RevisionRepository extends JpaRepository<Revision, Long> {

    List<Revision> findByVideoTaskIdOrderByRevisionNumberDesc(Long videoTaskId);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND (r.type = :type OR (:type = 'main' AND r.type IS NULL)) ORDER BY r.revisionNumber DESC")
    List<Revision> findByVideoTaskIdAndTypeOrderByRevisionNumberDesc(@Param("taskId") Long taskId, @Param("type") String type);

    @Query("SELECT MAX(r.revisionNumber) FROM Revision r WHERE r.videoTask.id = :taskId")
    Integer findMaxRevisionNumberByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT MAX(r.revisionNumber) FROM Revision r WHERE r.videoTask.id = :taskId AND (r.type = :type OR (:type = 'main' AND r.type IS NULL))")
    Integer findMaxRevisionNumberByTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestRevisionByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND (r.type = :type OR (:type = 'main' AND r.type IS NULL)) ORDER BY r.revisionNumber DESC LIMIT 1")
    Optional<Revision> findLatestRevisionByTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    long countByVideoTaskId(Long videoTaskId);

    @Query("SELECT COUNT(r) FROM Revision r WHERE r.videoTask.id = :taskId AND (r.type = :type OR (:type = 'main' AND r.type IS NULL))")
    long countByVideoTaskIdAndType(@Param("taskId") Long taskId, @Param("type") String type);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM revisions WHERE id = :revisionId", nativeQuery = true)
    int deleteByIdNativeSql(@Param("revisionId") Long revisionId);

    @Query("SELECT r FROM Revision r WHERE r.id = :revisionId")
    Optional<Revision> findByIdWithDetails(@Param("revisionId") Long revisionId);

    @Query("SELECT r FROM Revision r WHERE r.videoTask.id = :taskId AND (r.type IN :types OR ('main' IN :types AND r.type IS NULL)) ORDER BY r.revisionNumber DESC")
    List<Revision> findByVideoTaskIdAndTypeIn(@Param("taskId") Long taskId, @Param("types") List<String> types);
}