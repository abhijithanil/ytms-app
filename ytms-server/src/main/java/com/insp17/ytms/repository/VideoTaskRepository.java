package com.insp17.ytms.repository;

import com.insp17.ytms.entity.TaskStatus;
import com.insp17.ytms.entity.VideoTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VideoTaskRepository extends JpaRepository<VideoTask, Long> {

    List<VideoTask> findByAssignedEditorId(Long editorId);

    List<VideoTask> findByTaskStatus(TaskStatus taskStatus);

    List<VideoTask> findByAssignedEditorIdAndTaskStatus(Long editorId,
                                                        TaskStatus taskStatus);

    long countByTaskStatus(TaskStatus taskStatus);

    long countByAssignedEditorIdAndTaskStatus(Long editorId,
                                              TaskStatus taskStatus);

    /* ---------- custom JPQL ---------- */
    @Query("""
           SELECT vt
           FROM   VideoTask vt
           WHERE  vt.createdAt BETWEEN :startDate AND :endDate
           """)
    List<VideoTask> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate,
                                           @Param("endDate")   LocalDateTime endDate);


    // For displaying task with comments
    @Query("SELECT vt FROM VideoTask vt LEFT JOIN FETCH vt.comments WHERE vt.id = :id")
    VideoTask findByIdWithComments(@Param("id") Long id);

    // For editing scenarios where you need everything
    @Query("SELECT DISTINCT vt FROM VideoTask vt " +
            "LEFT JOIN FETCH vt.comments " +
            "LEFT JOIN FETCH vt.audioInstructions " +
            "LEFT JOIN FETCH vt.revisions " +
            "WHERE vt.id = :id")
    Optional<VideoTask> findByIdWithAllDetails(@Param("id") Long id);

    @Query("""
           SELECT vt
           FROM   VideoTask vt
           WHERE  vt.privacyLevel = 'ALL'
              OR  vt.id IN (SELECT tp.videoTask.id
                            FROM   TaskPermission tp
                            WHERE  tp.user.id = :userId)
           """)
    List<VideoTask> findVisibleTasksForUser(@Param("userId") Long userId);

    @Query("""
           SELECT vt
           FROM   VideoTask vt
           WHERE  vt.assignedEditor.id = :editorId
              OR  vt.createdBy.id      = :userId
              OR  vt.privacyLevel      = 'ALL'
              OR  vt.id IN (SELECT tp.videoTask.id
                            FROM   TaskPermission tp
                            WHERE  tp.user.id = :userId)
           """)
    List<VideoTask> findAccessibleTasksForUser(@Param("userId")  Long userId,
                                               @Param("editorId") Long editorId);

    @Query("SELECT COUNT(vt) FROM VideoTask vt WHERE vt.taskStatus = :taskStatus")
    long countAllByTaskStatus(@Param("taskStatus") TaskStatus taskStatus);

    @Query("""
           SELECT COUNT(vt)
           FROM   VideoTask vt
           WHERE  vt.assignedEditor.id = :editorId
             AND  vt.taskStatus        = :taskStatus
           """)
    long countByAssignedEditorIdAndTaskStatusJPQL(@Param("editorId")   Long editorId,
                                                  @Param("taskStatus") TaskStatus taskStatus);

    List<VideoTask> findTop10ByOrderByCreatedAtDesc();

    @Query("""
           SELECT vt
           FROM   VideoTask vt
           WHERE  vt.youtubeUploadTime <= :uploadTime
             AND  vt.taskStatus = 'SCHEDULED'
           """)
    List<VideoTask> findScheduledTasksForUpload(@Param("uploadTime") LocalDateTime uploadTime);
}


//
//@Repository
//public interface VideoTaskRepository extends JpaRepository<VideoTask, Long> {
//    List<VideoTask> findByAssignedEditorId(Long editorId);
//    List<VideoTask> findByCreatedById(Long createdById);
//    List<VideoTask> findByTaskStatus(TaskStatus status);
//    List<VideoTask> findByAssignedEditorIdAndStatus(Long editorId, TaskStatus status);
//
//    @Query("SELECT vt FROM VideoTask vt WHERE vt.createdAt >= :startDate AND vt.createdAt <= :endDate")
//    List<VideoTask> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
//
//    @Query("SELECT vt FROM VideoTask vt LEFT JOIN FETCH vt.comments LEFT JOIN FETCH vt.revisions LEFT JOIN FETCH vt.audioInstructions WHERE vt.id = :id")
//    Optional<VideoTask> findByIdWithDetails(@Param("id") Long id);
//
//    @Query("SELECT vt FROM VideoTask vt WHERE vt.privacyLevel = 'ALL' OR vt.id IN (SELECT tp.videoTask.id FROM TaskPermission tp WHERE tp.user.id = :userId)")
//    List<VideoTask> findVisibleTasksForUser(@Param("userId") Long userId);
//
//    @Query("SELECT vt FROM VideoTask vt WHERE vt.assignedEditor.id = :editorId OR vt.createdBy.id = :userId OR vt.privacyLevel = 'ALL' OR vt.id IN (SELECT tp.videoTask.id FROM TaskPermission tp WHERE tp.user.id = :userId)")
//    List<VideoTask> findAccessibleTasksForUser(@Param("userId") Long userId, @Param("editorId") Long editorId);
//
//    @Query("SELECT COUNT(vt) FROM VideoTask vt WHERE vt.taskStatus = :taskStatus")
//    long countByStatus(@Param("taskStatus") TaskStatus taskStatus);
//
//    @Query("SELECT COUNT(vt) FROM VideoTask vt WHERE vt.assignedEditor.id = :editorId AND vt.taskStatus = :taskStatus")
//    long countByAssignedEditorIdAndTaskStatus(@Param("editorId") Long editorId, @Param("taskStatus") TaskStatus taskStatus);
//
//    List<VideoTask> findTop10ByOrderByCreatedAtDesc();
//
//    @Query("SELECT vt FROM VideoTask vt WHERE vt.youtubeUploadTime <= :uploadTime AND vt.taskStatus = 'SCHEDULED'")
//    List<VideoTask> findScheduledTasksForUpload(@Param("uploadTime") LocalDateTime uploadTime);
//}