package com.nexus.platform.repository;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface MeasurementRepository extends JpaRepository<Measurement, MeasurementId> {

    List<Measurement> findByMeasurementVariableIdOrderByIdMeasuredAtDesc(Long variableId);

    List<Measurement> findByMeasurementVariableStationIdInOrderByIdMeasuredAtDesc(List<Long> stationIds);

    List<Measurement> findByMeasurementVariableIdAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
            Long variableId,
            Instant start,
            Instant end
    );

    List<Measurement> findByMeasurementVariableStationIdAndMeasurementVariableIdInAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
            Long stationId,
            Collection<Long> variableIds,
            Instant start,
            Instant end
    );

    List<Measurement> findTop5000ByMeasurementVariableStationIdAndMeasurementVariableIdInOrderByIdMeasuredAtAsc(
            Long stationId,
            Collection<Long> variableIds
    );

    @Query("""
            select measurement
            from Measurement measurement
            where measurement.measurementVariable.station.id = :stationId
              and measurement.measurementVariable.id in :variableIds
            order by measurement.id.measuredAt asc
            """)
    List<Measurement> findAllGraphMeasurements(
            @Param("stationId") Long stationId,
            @Param("variableIds") Collection<Long> variableIds
    );
}
