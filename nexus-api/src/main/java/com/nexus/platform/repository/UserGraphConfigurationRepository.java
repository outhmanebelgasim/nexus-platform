package com.nexus.platform.repository;

import com.nexus.domain.entity.UserGraphConfiguration;
import com.nexus.domain.enums.StationCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserGraphConfigurationRepository extends JpaRepository<UserGraphConfiguration, Long> {

    List<UserGraphConfiguration> findByUserIdOrderByDisplayOrderAscIdAsc(Long userId);

    List<UserGraphConfiguration> findByUserIdAndStationCategoryAndActiveTrueOrderByDisplayOrderAscIdAsc(Long userId, StationCategory category);

    List<UserGraphConfiguration> findByUserIdAndStationIdAndActiveTrueOrderByDisplayOrderAscIdAsc(Long userId, Long stationId);

    Optional<UserGraphConfiguration> findByIdAndUserId(Long id, Long userId);

    Optional<UserGraphConfiguration> findByIdAndUserIdAndStationId(Long id, Long userId, Long stationId);

    @Query("""
            select count(graph) > 0
            from UserGraphConfiguration graph
            where graph.user.id = :userId
              and graph.stationCategory = :category
              and graph.active = true
            """)
    boolean existsActiveByUserIdAndCategory(@Param("userId") Long userId, @Param("category") StationCategory category);

    @Query("""
            select count(graph) > 0
            from UserGraphConfiguration graph
            where graph.user.id = :userId
              and graph.station.id = :stationId
              and graph.active = true
            """)
    boolean existsActiveByUserIdAndStationId(@Param("userId") Long userId, @Param("stationId") Long stationId);
}
