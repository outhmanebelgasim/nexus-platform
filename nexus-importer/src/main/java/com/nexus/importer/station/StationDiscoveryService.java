package com.nexus.importer.station;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import jakarta.persistence.EntityManager;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexus.domain.entity.Farm;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.StationStatus;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.repository.ImporterFarmRepository;
import com.nexus.importer.repository.ImporterStationRepository;

@Service
public class StationDiscoveryService {

	public static final String UNASSIGNED_FARM_SYSTEM_KEY = "importer_unassigned_stations";
	public static final String UNASSIGNED_FARM_NAME = "Unassigned Stations";
	private static final String UNASSIGNED_FARM_DESCRIPTION =
			"Stations discovered automatically from importer files and awaiting assignment.";

	private final ImporterFarmRepository farmRepository;
	private final ImporterStationRepository stationRepository;
	private final EntityManager entityManager;
	private final Clock clock;

	@Autowired
	public StationDiscoveryService(
			ImporterFarmRepository farmRepository,
			ImporterStationRepository stationRepository,
			EntityManager entityManager) {
		this(farmRepository, stationRepository, entityManager, Clock.systemUTC());
	}

	StationDiscoveryService(
			ImporterFarmRepository farmRepository,
			ImporterStationRepository stationRepository,
			EntityManager entityManager,
			Clock clock) {
		this.farmRepository = farmRepository;
		this.stationRepository = stationRepository;
		this.entityManager = entityManager;
		this.clock = clock;
	}

	@Transactional
	public ResolvedStation resolve(DatFileDescriptor descriptor) {
		String normalizedCode = descriptor.stationCode();
		Farm placeholderFarm = ensurePlaceholderFarmForUpdate();

		Optional<Station> existingStation = stationRepository.findByCodeIgnoreCase(normalizedCode);
		if (existingStation.isPresent()) {
			Station station = existingStation.get();
			updateImporterSeenMetadata(station, descriptor);
			return new ResolvedStation(station, false);
		}

		try {
			Station station = createDiscoveredStation(descriptor, placeholderFarm);
			return new ResolvedStation(stationRepository.saveAndFlush(station), true);
		}
		catch (DataIntegrityViolationException ex) {
			clearPersistenceContext();
			Station station = stationRepository.findByCodeIgnoreCase(normalizedCode).orElseThrow(() -> ex);
			updateImporterSeenMetadata(station, descriptor);
			return new ResolvedStation(station, false);
		}
	}

	@Transactional
	public Farm ensurePlaceholderFarm() {
		return farmRepository.findBySystemKey(UNASSIGNED_FARM_SYSTEM_KEY)
				.orElseGet(this::createPlaceholderFarmWithDuplicateProtection);
	}

	private Farm createPlaceholderFarmWithDuplicateProtection() {
		try {
			Farm farm = Farm.builder()
					.name(UNASSIGNED_FARM_NAME)
					.description(UNASSIGNED_FARM_DESCRIPTION)
					.systemKey(UNASSIGNED_FARM_SYSTEM_KEY)
					.createdAt(clock.instant())
					.build();
			return farmRepository.saveAndFlush(farm);
		}
		catch (DataIntegrityViolationException ex) {
			clearPersistenceContext();
			return farmRepository.findBySystemKey(UNASSIGNED_FARM_SYSTEM_KEY).orElseThrow(() -> ex);
		}
	}

	private Farm ensurePlaceholderFarmForUpdate() {
		ensurePlaceholderFarm();
		return farmRepository.findBySystemKeyForUpdate(UNASSIGNED_FARM_SYSTEM_KEY)
				.orElseThrow(() -> new IllegalStateException("Importer placeholder farm was not created"));
	}

	private Station createDiscoveredStation(DatFileDescriptor descriptor, Farm placeholderFarm) {
		Instant now = clock.instant();
		return Station.builder()
				.farm(placeholderFarm)
				.name(toReadableName(descriptor.stationCode()))
				.code(descriptor.stationCode())
				.status(StationStatus.INACTIVE)
				.discoveredByImporter(true)
				.sourceFilename(descriptor.originalFilename())
				.lastSeenAt(now)
				.createdAt(now)
				.build();
	}

	private void updateImporterSeenMetadata(Station station, DatFileDescriptor descriptor) {
		station.setLastSeenAt(clock.instant());
		if (station.isDiscoveredByImporter() && station.getSourceFilename() == null) {
			station.setSourceFilename(descriptor.originalFilename());
		}
	}

	private void clearPersistenceContext() {
		if (entityManager != null) {
			entityManager.clear();
		}
	}

	private String toReadableName(String stationCode) {
		String[] parts = stationCode.split("_");
		if (parts.length == 0) {
			return stationCode;
		}

		String prefix = parts[0].toUpperCase(Locale.ROOT);
		if (parts.length == 1) {
			return prefix;
		}

		String site = parts[1].substring(0, 1).toUpperCase(Locale.ROOT)
				+ parts[1].substring(1).toLowerCase(Locale.ROOT);
		return prefix + " " + site;
	}

}
