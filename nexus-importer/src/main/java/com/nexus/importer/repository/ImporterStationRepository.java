package com.nexus.importer.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nexus.domain.entity.Station;

public interface ImporterStationRepository extends JpaRepository<Station, Long> {

	Optional<Station> findByCodeIgnoreCase(String code);

}
