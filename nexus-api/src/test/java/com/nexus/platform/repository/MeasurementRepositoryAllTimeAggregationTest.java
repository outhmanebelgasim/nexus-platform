package com.nexus.platform.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class MeasurementRepositoryAllTimeAggregationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MeasurementRepository measurementRepository;

    @Test
    void bucketedGraphMeasurementsExecutesAgainstTimescaleAndMapsProjectionTypes() {
        String suffix = UUID.randomUUID().toString();
        Long farmId = insertFarm(suffix);
        Long stationId = insertStation(farmId, suffix);
        Long variableId = insertVariable(stationId, suffix);
        Instant firstMeasuredAt = Instant.parse("2026-04-29T00:00:00Z");
        Instant lastMeasuredAt = Instant.parse("2026-07-28T12:00:00Z");
        insertMeasurement(variableId, firstMeasuredAt, 10.0);
        insertMeasurement(variableId, Instant.parse("2026-05-25T00:00:00Z"), 20.0);
        insertMeasurement(variableId, lastMeasuredAt, 30.0);

        var range = measurementRepository.findGraphMeasurementRange(stationId, List.of(variableId));
        var bucketed = measurementRepository.findBucketedGraphMeasurements(
                stationId,
                List.of(variableId),
                range.getFirstMeasuredAt(),
                range.getLastMeasuredAt(),
                "6 hours"
        );

        assertThat(range.getFirstMeasuredAt()).isEqualTo(firstMeasuredAt);
        assertThat(range.getLastMeasuredAt()).isEqualTo(lastMeasuredAt);
        assertThat(bucketed).hasSize(3);
        assertThat(bucketed).extracting(MeasurementRepository.BucketedMeasurementProjection::getVariableId)
                .containsOnly(variableId);
        assertThat(bucketed).extracting(MeasurementRepository.BucketedMeasurementProjection::getMeasuredAt)
                .isSorted();
        assertThat(bucketed.getLast().getMeasuredAt()).isEqualTo(lastMeasuredAt);
        assertThat(bucketed.getLast().getNumericValue()).isEqualTo(30.0);
    }

    private Long insertFarm(String suffix) {
        return jdbcTemplate.queryForObject(
                "insert into farms (name, created_at) values (?, now()) returning id",
                Long.class,
                "Aggregation Farm " + suffix
        );
    }

    private Long insertStation(Long farmId, String suffix) {
        return jdbcTemplate.queryForObject(
                "insert into stations (farm_id, name, code, status, station_category, created_at) values (?, ?, ?, 'ACTIVE', 'METEO', now()) returning id",
                Long.class,
                farmId,
                "Aggregation Station " + suffix,
                "AGG_" + suffix
        );
    }

    private Long insertVariable(Long stationId, String suffix) {
        return jdbcTemplate.queryForObject(
                "insert into measurement_variables (station_id, code, display_name, data_type, active, created_at) values (?, ?, ?, 'NUMERIC', true, now()) returning id",
                Long.class,
                stationId,
                "TEMP_" + suffix,
                "Temperature " + suffix
        );
    }

    private void insertMeasurement(Long variableId, Instant measuredAt, Double numericValue) {
        jdbcTemplate.update(
                "insert into measurements (measured_at, variable_id, numeric_value, quality, created_at) values (?, ?, ?, 'VALID', now())",
                Timestamp.from(measuredAt),
                variableId,
                numericValue
        );
    }
}
