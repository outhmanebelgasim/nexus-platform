package com.nexus.platform.repository;

import com.nexus.domain.entity.MeasurementVariable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeasurementVariableRepository extends JpaRepository<MeasurementVariable, Long> {

    List<MeasurementVariable> findByStationId(Long stationId);

    List<MeasurementVariable> findByStationIdIn(List<Long> stationIds);

    boolean existsByStationIdAndCode(Long stationId, String code);
}
