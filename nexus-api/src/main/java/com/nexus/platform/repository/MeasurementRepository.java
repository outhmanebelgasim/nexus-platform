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

    @Query(value = """
            select min(measurement.measured_at) as first_measured_at,
                   max(measurement.measured_at) as last_measured_at
            from measurements measurement
            join measurement_variables variable on variable.id = measurement.variable_id
            where variable.station_id = :stationId
              and measurement.variable_id in (:variableIds)
            """, nativeQuery = true)
    MeasurementRangeProjection findGraphMeasurementRange(
            @Param("stationId") Long stationId,
            @Param("variableIds") Collection<Long> variableIds
    );

    @Query(value = """
            select bucketed.variable_id as variable_id,
                   bucketed.bucket_time as measured_at,
                   avg(bucketed.numeric_value) as numeric_value
            from (
                select measurement.variable_id,
                       time_bucket(cast(:bucketInterval as interval), measurement.measured_at) as bucket_time,
                       measurement.numeric_value
                from measurements measurement
                join measurement_variables variable on variable.id = measurement.variable_id
                where variable.station_id = :stationId
                  and measurement.variable_id in (:variableIds)
                  and measurement.measured_at >= :start
                  and measurement.measured_at <= :end
                  and measurement.numeric_value is not null
            ) bucketed
            group by bucketed.variable_id, bucketed.bucket_time
            order by bucketed.bucket_time asc, bucketed.variable_id asc
            """, nativeQuery = true)
    List<BucketedMeasurementProjection> findBucketedGraphMeasurements(
            @Param("stationId") Long stationId,
            @Param("variableIds") Collection<Long> variableIds,
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("bucketInterval") String bucketInterval
    );

    interface MeasurementRangeProjection {
        Instant getFirstMeasuredAt();

        Instant getLastMeasuredAt();
    }

    interface BucketedMeasurementProjection {
        Long getVariableId();

        Instant getMeasuredAt();

        Double getNumericValue();
    }
}
