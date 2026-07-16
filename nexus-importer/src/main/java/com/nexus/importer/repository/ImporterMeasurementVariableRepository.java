package com.nexus.importer.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nexus.domain.entity.MeasurementVariable;

public interface ImporterMeasurementVariableRepository extends JpaRepository<MeasurementVariable, Long> {

	Optional<MeasurementVariable> findByStationIdAndCodeIgnoreCase(Long stationId, String code);

	List<MeasurementVariable> findByStationId(Long stationId);

}
