package com.nexus.platform.repository;

import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.StationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StationRepository extends JpaRepository<Station, Long> {

    List<Station> findByFarmId(Long farmId);

    List<Station> findByIdIn(List<Long> ids);

    List<Station> findByFarmIdIn(List<Long> farmIds);

    List<Station> findByIdInAndStationCategoryOrderByNameAscCodeAsc(List<Long> ids, StationCategory stationCategory);

    Optional<Station> findByCode(String code);

    boolean existsByCode(String code);
}
