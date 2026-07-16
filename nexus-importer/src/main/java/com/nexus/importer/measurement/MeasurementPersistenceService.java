package com.nexus.importer.measurement;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedMeasurementValue;
import com.nexus.importer.parser.ValueStatus;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;

@Service
public class MeasurementPersistenceService {

	private final MeasurementBatchUpsertDao measurementBatchUpsertDao;
	private final NexusImporterProperties properties;
	private final Clock clock;

	@Autowired
	public MeasurementPersistenceService(
			MeasurementBatchUpsertDao measurementBatchUpsertDao,
			NexusImporterProperties properties) {
		this(measurementBatchUpsertDao, properties, Clock.systemUTC());
	}

	MeasurementPersistenceService(
			MeasurementBatchUpsertDao measurementBatchUpsertDao,
			NexusImporterProperties properties,
			Clock clock) {
		this.measurementBatchUpsertDao = measurementBatchUpsertDao;
		this.properties = properties;
		this.clock = clock;
	}

	public MeasurementPersistenceResult persist(
			ParsedDatFile parsedFile,
			MeasurementVariableResolutionResult variableResolution,
			UUID importBatchId) {
		Instant startedAt = clock.instant();
		CandidateBuildResult candidateBuildResult = buildCandidates(parsedFile, variableResolution, importBatchId);
		List<MeasurementImportCandidate> candidates = candidateBuildResult.candidates();
		List<List<MeasurementImportCandidate>> batches = batches(candidates, properties.measurementBatchSize());
		int inserted = 0;
		int updated = 0;
		int unchanged = 0;

		for (List<MeasurementImportCandidate> batch : batches) {
			Map<MeasurementKey, ExistingMeasurementValue> existingValues = measurementBatchUpsertDao.findExistingValues(batch);
			for (MeasurementImportCandidate candidate : batch) {
				ExistingMeasurementValue existingValue = existingValues.get(new MeasurementKey(candidate.variableId(), candidate.measuredAt()));
				if (existingValue == null) {
					inserted++;
				}
				else if (Double.compare(existingValue.numericValue(), candidate.numericValue()) == 0) {
					unchanged++;
				}
				else {
					updated++;
				}
			}
			measurementBatchUpsertDao.upsert(batch, properties.measurementBatchSize());
		}

		return new MeasurementPersistenceResult(
				candidates.size(),
				inserted,
				updated,
				unchanged,
				candidateBuildResult.missing(),
				candidateBuildResult.invalid(),
				parsedFile.skippedRowCount() > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) parsedFile.skippedRowCount(),
				batches.size(),
				Duration.between(startedAt, clock.instant()));
	}

	private CandidateBuildResult buildCandidates(
			ParsedDatFile parsedFile,
			MeasurementVariableResolutionResult variableResolution,
			UUID importBatchId) {
		Map<MeasurementKey, MeasurementImportCandidate> candidates = new LinkedHashMap<>();
		int missing = 0;
		int invalid = 0;
		Instant createdAt = clock.instant();

		for (ParsedDataRow row : parsedFile.rows()) {
			Instant measuredAt = toInstant(row.timestamp());
			for (ParsedMeasurementValue value : row.values().values()) {
				if (value.status() == ValueStatus.MISSING) {
					missing++;
					continue;
				}
				if (value.status() == ValueStatus.INVALID) {
					invalid++;
					continue;
				}

				MeasurementVariable variable = variableResolution.variablesByColumnIndex().get(value.columnIndex());
				if (variable == null || variable.getId() == null) {
					continue;
				}

				MeasurementKey key = new MeasurementKey(variable.getId(), measuredAt);
				candidates.put(key, new MeasurementImportCandidate(
						variable.getId(),
						measuredAt,
						value.numericValue(),
						importBatchId,
						createdAt));
			}
		}

		return new CandidateBuildResult(List.copyOf(candidates.values()), missing, invalid);
	}

	private List<List<MeasurementImportCandidate>> batches(List<MeasurementImportCandidate> candidates, int batchSize) {
		List<List<MeasurementImportCandidate>> batches = new ArrayList<>();
		for (int start = 0; start < candidates.size(); start += batchSize) {
			batches.add(candidates.subList(start, Math.min(start + batchSize, candidates.size())));
		}
		return batches;
	}

	private Instant toInstant(LocalDateTime timestamp) {
		ZoneId sourceTimeZone = properties.sourceTimeZone();
		return timestamp.atZone(sourceTimeZone).toInstant();
	}

	private record CandidateBuildResult(List<MeasurementImportCandidate> candidates, int missing, int invalid) {
	}
}
