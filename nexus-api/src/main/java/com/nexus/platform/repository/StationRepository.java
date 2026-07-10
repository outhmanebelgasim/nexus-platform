package com.nexus.platform.repository;

import com.nexus.domain.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StationRepository extends JpaRepository<Station, Long> {

    List<Station> findByFarmId(Long farmId);

    List<Station> findByIdIn(List<Long> ids);

    List<Station> findByFarmIdIn(List<Long> farmIds);

    Optional<Station> findByCode(String code);

    boolean existsByCode(String code);
}
