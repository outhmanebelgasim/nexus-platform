package com.nexus.importer.variable;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.MeasurementVariableDataType;
import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.repository.ImporterMeasurementVariableRepository;

@Service
public class MeasurementVariableResolutionService {

	private static final Logger log = LoggerFactory.getLogger(MeasurementVariableResolutionService.class);

	private final ImporterMeasurementVariableRepository measurementVariableRepository;
	private final NexusImporterProperties properties;
	private final Clock clock;

	@Autowired
	public MeasurementVariableResolutionService(
			ImporterMeasurementVariableRepository measurementVariableRepository,
			NexusImporterProperties properties) {
		this(measurementVariableRepository, properties, Clock.systemUTC());
	}

	MeasurementVariableResolutionService(
			ImporterMeasurementVariableRepository measurementVariableRepository,
			NexusImporterProperties properties,
			Clock clock) {
		this.measurementVariableRepository = measurementVariableRepository;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	public MeasurementVariableResolutionResult resolve(Station station, ParsedDatFile parsedFile) {
		Map<Integer, MeasurementVariable> variablesByColumnIndex = new LinkedHashMap<>();
		Instant earliestSeenAt = earliestTimestamp(parsedFile);
		Instant latestSeenAt = latestTimestamp(parsedFile);
		int createdCount = 0;
		int reusedCount = 0;
		int updatedCount = 0;
		int unitConflictCount = 0;

		for (ParsedVariableHeader header : parsedFile.variables()) {
			if (header.timestampColumn()) {
				continue;
			}

			ResolvedVariable resolvedVariable = resolveVariable(station, header, earliestSeenAt, latestSeenAt);
			variablesByColumnIndex.put(header.columnIndex(), resolvedVariable.variable());
			if (resolvedVariable.created()) {
				createdCount++;
			}
			else {
				reusedCount++;
			}
			if (resolvedVariable.updated()) {
				updatedCount++;
			}
			if (resolvedVariable.unitConflict()) {
				unitConflictCount++;
				log.warn("Preserved existing measurement variable unit after conflict stationCode={} variableCode={} existingUnit={} parsedUnit={} filename={}",
						station.getCode(),
						resolvedVariable.variable().getCode(),
						resolvedVariable.variable().getUnit(),
						normalizeUnit(header.unit()),
						parsedFile.descriptor().originalFilename());
			}
		}

		return new MeasurementVariableResolutionResult(
				Map.copyOf(variablesByColumnIndex),
				createdCount,
				reusedCount,
				updatedCount,
				unitConflictCount);
	}

	private ResolvedVariable resolveVariable(
			Station station,
			ParsedVariableHeader header,
			Instant earliestSeenAt,
			Instant latestSeenAt) {
		Optional<MeasurementVariable> existingVariable = measurementVariableRepository
				.findByStationIdAndCodeIgnoreCase(station.getId(), header.code());
		if (existingVariable.isPresent()) {
			UpdateResult updateResult = updateExistingVariable(existingVariable.get(), header, earliestSeenAt, latestSeenAt);
			return new ResolvedVariable(existingVariable.get(), false, updateResult.updated(), updateResult.unitConflict());
		}

		try {
			MeasurementVariable createdVariable = measurementVariableRepository.saveAndFlush(
					newVariable(station, header, earliestSeenAt, latestSeenAt));
			return new ResolvedVariable(createdVariable, true, false, false);
		}
		catch (DataIntegrityViolationException ex) {
			MeasurementVariable concurrentlyCreatedVariable = measurementVariableRepository
					.findByStationIdAndCodeIgnoreCase(station.getId(), header.code())
					.orElseThrow(() -> ex);
			UpdateResult updateResult = updateExistingVariable(concurrentlyCreatedVariable, header, earliestSeenAt, latestSeenAt);
			return new ResolvedVariable(concurrentlyCreatedVariable, false, updateResult.updated(), updateResult.unitConflict());
		}
	}

	private MeasurementVariable newVariable(
			Station station,
			ParsedVariableHeader header,
			Instant earliestSeenAt,
			Instant latestSeenAt) {
		Instant now = clock.instant();
		return MeasurementVariable.builder()
				.station(station)
				.code(header.code())
				.unit(normalizeUnit(header.unit()))
				.dataType(MeasurementVariableDataType.NUMERIC)
				.active(true)
				.firstSeenAt(earliestSeenAt)
				.lastSeenAt(latestSeenAt)
				.createdAt(now)
				.updatedAt(now)
				.build();
	}

	private UpdateResult updateExistingVariable(
			MeasurementVariable variable,
			ParsedVariableHeader header,
			Instant earliestSeenAt,
			Instant latestSeenAt) {
		boolean updated = false;
		boolean unitConflict = false;

		if (!variable.isActive()) {
			variable.setActive(true);
			updated = true;
		}

		if (earliestSeenAt != null && (variable.getFirstSeenAt() == null || earliestSeenAt.isBefore(variable.getFirstSeenAt()))) {
			variable.setFirstSeenAt(earliestSeenAt);
			updated = true;
		}

		if (latestSeenAt != null && (variable.getLastSeenAt() == null || latestSeenAt.isAfter(variable.getLastSeenAt()))) {
			variable.setLastSeenAt(latestSeenAt);
			updated = true;
		}

		String parsedUnit = normalizeUnit(header.unit());
		String existingUnit = normalizeUnit(variable.getUnit());
		if (existingUnit == null && parsedUnit != null) {
			variable.setUnit(parsedUnit);
			updated = true;
		}
		else if (existingUnit != null && parsedUnit != null && !existingUnit.equals(parsedUnit)) {
			unitConflict = true;
		}

		if (updated) {
			variable.setUpdatedAt(clock.instant());
		}
		return new UpdateResult(updated, unitConflict);
	}

	private Instant earliestTimestamp(ParsedDatFile parsedFile) {
		return parsedFile.rows().stream()
				.map(ParsedDataRow::timestamp)
				.min(LocalDateTime::compareTo)
				.map(this::toInstant)
				.orElse(null);
	}

	private Instant latestTimestamp(ParsedDatFile parsedFile) {
		return parsedFile.rows().stream()
				.map(ParsedDataRow::timestamp)
				.max(LocalDateTime::compareTo)
				.map(this::toInstant)
				.orElse(null);
	}

	private Instant toInstant(LocalDateTime timestamp) {
		ZoneId sourceTimeZone = properties.sourceTimeZone();
		return timestamp.atZone(sourceTimeZone).toInstant();
	}

	private String normalizeUnit(String unit) {
		if (unit == null || unit.isBlank()) {
			return null;
		}
		return unit.trim();
	}

	private record ResolvedVariable(
			MeasurementVariable variable,
			boolean created,
			boolean updated,
			boolean unitConflict) {
	}

	private record UpdateResult(boolean updated, boolean unitConflict) {
	}
}
