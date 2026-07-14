package com.nexus.platform.repository;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface MeasurementRepository extends JpaRepository<Measurement, MeasurementId> {

    List<Measurement> findByMeasurementVariableIdOrderByIdMeasuredAtDesc(Long variableId);

    List<Measurement> findByMeasurementVariableStationIdInOrderByIdMeasuredAtDesc(List<Long> stationIds);

    List<Measurement> findByMeasurementVariableIdAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
            Long variableId,
            Instant start,
            Instant end
    );
}
