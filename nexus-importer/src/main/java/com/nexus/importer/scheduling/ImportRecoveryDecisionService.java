package com.nexus.importer.scheduling;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.repository.ImporterMeasurementRepository;
import com.nexus.importer.repository.ImporterMeasurementVariableRepository;
import com.nexus.importer.repository.StationMeasurementStats;
import com.nexus.importer.state.ImportStateDecision;
import com.nexus.importer.station.ResolvedStation;

@Service
public class ImportRecoveryDecisionService {

	private final ImporterMeasurementVariableRepository measurementVariableRepository;
	private final ImporterMeasurementRepository measurementRepository;
	private final NexusImporterProperties properties;

	public ImportRecoveryDecisionService(
			ImporterMeasurementVariableRepository measurementVariableRepository,
			ImporterMeasurementRepository measurementRepository,
			NexusImporterProperties properties) {
		this.measurementVariableRepository = measurementVariableRepository;
		this.measurementRepository = measurementRepository;
		this.properties = properties;
	}

	public ImportRecoveryDecision decide(
			DatFileDescriptor descriptor,
			ResolvedStation resolvedStation,
			ImportStateDecision stateDecision,
			ParsedDatFile parsedFile,
			String headerSignature) {
		if (resolvedStation.created()) {
			return ImportRecoveryDecision.fullRescan("station-created");
		}

		Station station = resolvedStation.station();
		var existingVariables = measurementVariableRepository.findByStationId(station.getId());
		Set<String> existingVariableCodes = existingVariables.stream()
				.map(MeasurementVariable::getCode)
				.filter(code -> code != null && !code.isBlank())
				.map(code -> code.toLowerCase(Locale.ROOT))
				.collect(Collectors.toSet());

		if (existingVariableCodes.isEmpty()) {
			return ImportRecoveryDecision.fullRescan("station-has-no-variables");
		}

		long expectedVariableCount = parsedFile.variables().stream()
				.filter(variable -> !variable.timestampColumn())
				.count();
		boolean missingHeaderVariable = parsedFile.variables().stream()
				.filter(variable -> !variable.timestampColumn())
				.map(ParsedVariableHeader::code)
				.map(code -> code.toLowerCase(Locale.ROOT))
				.anyMatch(code -> !existingVariableCodes.contains(code));
		if (missingHeaderVariable) {
			return ImportRecoveryDecision.fullRescan("missing-header-variable");
		}

		if (existingVariables.size() < expectedVariableCount) {
			return ImportRecoveryDecision.fullRescan("station-variable-count-less-than-header");
		}

		SourceTimeBounds sourceBounds = sourceTimeBounds(parsedFile);
		StationMeasurementStats measurementStats = measurementRepository.summarizeByStationId(station.getId());
		long measurementCount = measurementStats == null ? 0 : measurementStats.getMeasurementCount();
		Instant earliestStored = measurementStats == null ? null : measurementStats.getEarliestMeasuredAt();
		Instant latestStored = measurementStats == null ? null : measurementStats.getLatestMeasuredAt();

		if (sourceBounds.hasRows() && measurementCount == 0) {
			return ImportRecoveryDecision.fullRescan("station-has-no-measurements");
		}
		if (sourceBounds.earliest() != null && earliestStored != null && earliestStored.isAfter(sourceBounds.earliest())) {
			return ImportRecoveryDecision.fullRescan("database-earliest-after-file-earliest");
		}
		if (stateDecision.existingState() != null
				&& stateDecision.existingState().getLastProcessedTimestamp() != null
				&& latestStored != null
				&& stateDecision.existingState().getLastProcessedTimestamp().isAfter(latestStored)) {
			return ImportRecoveryDecision.fullRescan("checkpoint-timestamp-after-database-latest");
		}
		if (stateDecision.existingState() != null
				&& stateDecision.existingState().getHeaderSignature() != null
				&& !stateDecision.existingState().getHeaderSignature().equals(headerSignature)) {
			return ImportRecoveryDecision.fullRescan("header-signature-changed");
		}
		if (stateDecision.existingState() != null
				&& stateDecision.metadata().fileSizeBytes() < stateDecision.existingState().getFileSizeBytes()) {
			return ImportRecoveryDecision.fullRescan("file-truncated-or-replaced");
		}
		if (!stateDecision.unchanged()) {
			return ImportRecoveryDecision.importRequired("checkpoint-not-unchanged");
		}

		return ImportRecoveryDecision.skip("unchanged-healthy");
	}

	private SourceTimeBounds sourceTimeBounds(ParsedDatFile parsedFile) {
		ZoneId sourceTimeZone = properties.sourceTimeZone();
		Instant earliest = parsedFile.rows().stream()
				.map(ParsedDataRow::timestamp)
				.min(LocalDateTime::compareTo)
				.map(timestamp -> timestamp.atZone(sourceTimeZone).toInstant())
				.orElse(null);
		Instant latest = parsedFile.rows().stream()
				.map(ParsedDataRow::timestamp)
				.max(LocalDateTime::compareTo)
				.map(timestamp -> timestamp.atZone(sourceTimeZone).toInstant())
				.orElse(null);
		return new SourceTimeBounds(earliest, latest);
	}

	private record SourceTimeBounds(Instant earliest, Instant latest) {
		boolean hasRows() {
			return earliest != null || latest != null;
		}
	}
}
