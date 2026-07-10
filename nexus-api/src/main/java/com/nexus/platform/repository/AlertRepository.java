package com.nexus.platform.repository;

import com.nexus.domain.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findBySensorId(Long sensorId);

    List<Alert> findBySensorStationIdIn(List<Long> stationIds);

    List<Alert> findByStatus(String status);
}
