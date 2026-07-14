package com.nexus.platform.repository;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    Optional<AppUser> findByEmailIgnoreCaseAndRoleIn(String email, Collection<Role> roles);

    List<AppUser> findByRoleIn(Collection<Role> roles);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Modifying
    @Query("update AppUser user set user.createdById = null where user.createdById = :createdById")
    void clearCreatedById(Long createdById);
}
