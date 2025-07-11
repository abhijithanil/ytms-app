package com.insp17.ytms.repository;

import com.insp17.ytms.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByVideoTaskId(Long videoTaskId);

    List<Comment> findByVideoTaskIdOrderByCreatedAtDesc(Long videoTaskId);

    List<Comment> findByRevisionId(Long revisionId);

    List<Comment> findByAuthorId(Long authorId);

    @Query("SELECT c FROM Comment c WHERE c.videoTask.id = :taskId AND c.revision IS NULL ORDER BY c.createdAt DESC")
    List<Comment> findGeneralCommentsByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT c FROM Comment c WHERE c.revision.id = :revisionId ORDER BY c.createdAt DESC")
    List<Comment> findCommentsByRevisionId(@Param("revisionId") Long revisionId);

    @Query("SELECT COUNT(c) FROM Comment c WHERE c.videoTask.id = :taskId")
    long countByVideoTaskId(@Param("taskId") Long taskId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Comment c WHERE c.id = :id")
    int deleteByIdNativeSql(@Param("id") Long id);
}