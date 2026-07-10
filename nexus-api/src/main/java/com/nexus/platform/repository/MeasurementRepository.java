package com.nexus.platform.repository;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface MeasurementRepository extends JpaRepository<Measurement, MeasurementId> {

    List<Measurement> findBySensorIdOrderByIdTimeDesc(Long sensorId);

    List<Measurement> findBySensorStationIdInOrderByIdTimeDesc(List<Long> stationIds);

    List<Measurement> findBySensorIdAndIdTimeBetweenOrderByIdTimeAsc(
            Long sensorId,
            Instant start,
            Instant end
    );
}
