package com.nexus.platform.repository;

import com.nexus.domain.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByMeasurementVariableId(Long variableId);

    List<Alert> findByMeasurementVariableStationIdIn(List<Long> stationIds);

    List<Alert> findByStatus(String status);
}
