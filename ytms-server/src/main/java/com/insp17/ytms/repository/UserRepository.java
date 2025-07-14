package com.insp17.ytms.repository;

import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    List<User> findByRole(UserRole role);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.role IN ('EDITOR', 'ADMIN')")
    List<User> findEditorsAndAdmins();

    @Query("SELECT u FROM User u WHERE u.role = 'VIEWER'")
    List<User> findViewers();

    Optional<User> findFirstByRoleOrderByIdAsc(UserRole role);

    @Query("SELECT u FROM User u WHERE u.userStatus = 'ACTIVE'")
    List<User> findAllActiveUsers();
}