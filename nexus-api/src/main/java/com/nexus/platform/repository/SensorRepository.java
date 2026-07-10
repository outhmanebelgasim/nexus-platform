package com.nexus.platform.repository;

import com.nexus.domain.entity.Sensor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, Long> {

    List<Sensor> findByStationId(Long stationId);

    List<Sensor> findByStationIdIn(List<Long> stationIds);

    Optional<Sensor> findByCode(String code);

    boolean existsByCode(String code);
}
