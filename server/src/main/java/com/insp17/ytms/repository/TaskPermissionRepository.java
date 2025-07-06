package com.insp17.ytms.repository;

import com.insp17.ytms.entity.PermissionType;
import com.insp17.ytms.entity.TaskPermission;
import com.insp17.ytms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskPermissionRepository extends JpaRepository<TaskPermission, Long> {
    List<TaskPermission> findByVideoTaskId(Long videoTaskId);
    List<TaskPermission> findByUserId(Long userId);
    List<TaskPermission> findByVideoTaskIdAndPermissionType(Long videoTaskId, PermissionType permissionType);

    Optional<TaskPermission> findByVideoTaskIdAndUserId(Long videoTaskId, Long userId);

    void deleteByVideoTaskIdAndUserId(Long videoTaskId, Long userId);

    boolean existsByVideoTaskIdAndUserIdAndPermissionType(Long videoTaskId, Long userId, PermissionType permissionType);

    @Query("SELECT tp.user FROM TaskPermission tp WHERE tp.videoTask.id = :taskId AND tp.permissionType = :permissionType")
    List<User> findUsersByTaskIdAndPermissionType(@Param("taskId") Long taskId, @Param("permissionType") PermissionType permissionType);
}