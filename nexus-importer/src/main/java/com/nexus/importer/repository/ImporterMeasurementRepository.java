package com.nexus.importer.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;

public interface ImporterMeasurementRepository extends JpaRepository<Measurement, MeasurementId> {

	@Query("""
			select min(m.id.measuredAt) as earliestMeasuredAt,
			       max(m.id.measuredAt) as latestMeasuredAt,
			       count(m) as measurementCount
			from Measurement m
			where m.measurementVariable.station.id = :stationId
			""")
	StationMeasurementStats summarizeByStationId(@Param("stationId") Long stationId);
}
