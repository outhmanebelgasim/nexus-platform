package com.nexus.importer.measurement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.parser.DatParseIssue;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedMeasurementValue;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.parser.ValueStatus;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;

class MeasurementPersistenceServiceTest {

	private static final ZoneId SOURCE_ZONE = ZoneId.of("Africa/Casablanca");
	private static final Instant NOW = Instant.parse("2026-07-16T12:00:00Z");
	private static final UUID BATCH_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

	private final MeasurementBatchUpsertDao dao = org.mockito.Mockito.mock(MeasurementBatchUpsertDao.class);
	private final MeasurementPersistenceService service = new MeasurementPersistenceService(
			dao,
			properties(2),
			Clock.fixed(NOW, ZoneOffset.UTC));

	@Test
	void insertsValidMeasurementsAndIgnoresMissingAndInvalidCells() {
		when(dao.findExistingValues(any())).thenReturn(Map.of());
		when(dao.upsert(any(), anyInt())).thenReturn(new int[][] {{1, 1}});

		MeasurementPersistenceResult result = service.persist(parsedFile(row(
				LocalDateTime.of(2026, 2, 9, 13, 30),
				value(1, "20.5", 20.5, ValueStatus.VALID),
				value(2, "", null, ValueStatus.MISSING),
				value(3, "abc", null, ValueStatus.INVALID))),
				variables(variable(101L, "AirTC_Avg"), variable(102L, "RH_Avg"), variable(103L, "Bad")),
				BATCH_ID);

		assertThat(result.candidates()).isEqualTo(1);
		assertThat(result.inserted()).isEqualTo(1);
		assertThat(result.updated()).isZero();
		assertThat(result.unchanged()).isZero();
		assertThat(result.missing()).isEqualTo(1);
		assertThat(result.invalid()).isEqualTo(1);
		assertThat(capturedCandidates().get(0).variableId()).isEqualTo(101L);
		assertThat(capturedCandidates().get(0).measuredAt()).isEqualTo(toInstant(LocalDateTime.of(2026, 2, 9, 13, 30)));
		assertThat(capturedCandidates().get(0).numericValue()).isEqualTo(20.5);
		assertThat(capturedCandidates().get(0).importBatchId()).isEqualTo(BATCH_ID);
	}

	@Test
	void repeatedImportCreatesNoDuplicatesWhenExistingValueIsIdentical() {
		Instant measuredAt = toInstant(LocalDateTime.of(2026, 2, 9, 13, 30));
		when(dao.findExistingValues(any())).thenReturn(Map.of(
				new MeasurementKey(101L, measuredAt),
				new ExistingMeasurementValue(101L, measuredAt, 20.5)));

		MeasurementPersistenceResult result = service.persist(parsedFile(row(
				LocalDateTime.of(2026, 2, 9, 13, 30),
				value(1, "20.5", 20.5, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg")),
				BATCH_ID);

		assertThat(result.inserted()).isZero();
		assertThat(result.updated()).isZero();
		assertThat(result.unchanged()).isEqualTo(1);
	}

	@Test
	void correctedValueUpdatesExistingRowInPlace() {
		Instant measuredAt = toInstant(LocalDateTime.of(2026, 2, 9, 13, 30));
		when(dao.findExistingValues(any())).thenReturn(Map.of(
				new MeasurementKey(101L, measuredAt),
				new ExistingMeasurementValue(101L, measuredAt, 19.0)));

		MeasurementPersistenceResult result = service.persist(parsedFile(row(
				LocalDateTime.of(2026, 2, 9, 13, 30),
				value(1, "20.5", 20.5, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg")),
				BATCH_ID);

		assertThat(result.inserted()).isZero();
		assertThat(result.updated()).isEqualTo(1);
		assertThat(result.unchanged()).isZero();
	}

	@Test
	void sameTimestampAcrossDifferentVariablesWorks() {
		when(dao.findExistingValues(any())).thenReturn(Map.of());

		MeasurementPersistenceResult result = service.persist(parsedFile(row(
				LocalDateTime.of(2026, 2, 9, 13, 30),
				value(1, "20.5", 20.5, ValueStatus.VALID),
				value(2, "61", 61.0, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg"), variable(102L, "RH_Avg")),
				BATCH_ID);

		assertThat(result.candidates()).isEqualTo(2);
		assertThat(capturedCandidates()).extracting(MeasurementImportCandidate::variableId)
				.containsExactly(101L, 102L);
	}

	@Test
	void timezoneConversionUsesConfiguredSourceZone() {
		when(dao.findExistingValues(any())).thenReturn(Map.of());

		service.persist(parsedFile(row(
				LocalDateTime.of(2026, 7, 16, 12, 0),
				value(1, "20.5", 20.5, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg")),
				BATCH_ID);

		assertThat(capturedCandidates().get(0).measuredAt())
				.isEqualTo(LocalDateTime.of(2026, 7, 16, 12, 0).atZone(SOURCE_ZONE).toInstant());
	}

	@Test
	void batchesCandidatesUsingConfiguredBatchSize() {
		when(dao.findExistingValues(any())).thenReturn(Map.of());

		MeasurementPersistenceResult result = service.persist(parsedFile(
				row(LocalDateTime.of(2026, 2, 9, 13, 30), value(1, "1", 1.0, ValueStatus.VALID)),
				row(LocalDateTime.of(2026, 2, 9, 14, 0), value(1, "2", 2.0, ValueStatus.VALID)),
				row(LocalDateTime.of(2026, 2, 9, 14, 30), value(1, "3", 3.0, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg")),
				BATCH_ID);

		assertThat(result.candidates()).isEqualTo(3);
		assertThat(result.batches()).isEqualTo(2);
		verify(dao, org.mockito.Mockito.times(2)).upsert(any(), anyInt());
	}

	@Test
	void failurePropagatesForFileTransactionRollback() {
		when(dao.findExistingValues(any())).thenThrow(new DataAccessResourceFailureException("database unavailable"));

		assertThatThrownBy(() -> service.persist(parsedFile(row(
				LocalDateTime.of(2026, 2, 9, 13, 30),
				value(1, "1", 1.0, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg")),
				BATCH_ID))
				.isInstanceOf(DataAccessResourceFailureException.class);
		verify(dao, never()).upsert(any(), anyInt());
	}

	@Test
	void concurrentUpsertSafetyDelegatesToDatabaseConflictHandling() {
		when(dao.findExistingValues(any())).thenReturn(Map.of());
		when(dao.upsert(any(), anyInt())).thenReturn(new int[][] {{1}});

		MeasurementPersistenceResult result = service.persist(parsedFile(row(
				LocalDateTime.of(2026, 2, 9, 13, 30),
				value(1, "1", 1.0, ValueStatus.VALID))),
				variables(variable(101L, "AirTC_Avg")),
				BATCH_ID);

		assertThat(result.inserted()).isEqualTo(1);
		verify(dao).upsert(any(), anyInt());
	}

	private List<MeasurementImportCandidate> capturedCandidates() {
		org.mockito.ArgumentCaptor<List<MeasurementImportCandidate>> captor = org.mockito.ArgumentCaptor.forClass(List.class);
		verify(dao, org.mockito.Mockito.atLeastOnce()).upsert(captor.capture(), anyInt());
		return captor.getAllValues().stream().flatMap(List::stream).toList();
	}

	private static NexusImporterProperties properties(int batchSize) {
		return new NexusImporterProperties(
				Path.of("/tmp"),
				true,
				Duration.ofMinutes(30),
				Duration.ofSeconds(10),
				Duration.ofMinutes(2),
				SOURCE_ZONE,
				batchSize);
	}

	private static ParsedDatFile parsedFile(ParsedDataRow... rows) {
		return new ParsedDatFile(
				new DatFileDescriptor(Path.of("/tmp/MTO_Yazid.dat"), "MTO_Yazid.dat", "mto_yazid", DatFileType.THIRTY_MINUTE),
				List.of(
						new ParsedVariableHeader(0, "TIMESTAMP", "TS", "", true),
						new ParsedVariableHeader(1, "AirTC_Avg", "Deg C", "Avg", false),
						new ParsedVariableHeader(2, "RH_Avg", "%", "Avg", false),
						new ParsedVariableHeader(3, "Bad", "", "Avg", false)),
				List.of(rows),
				List.<DatParseIssue>of());
	}

	private static ParsedDataRow row(LocalDateTime timestamp, ParsedMeasurementValue... values) {
		Map<Integer, ParsedMeasurementValue> valuesByColumn = new LinkedHashMap<>();
		for (ParsedMeasurementValue value : values) {
			valuesByColumn.put(value.columnIndex(), value);
		}
		return new ParsedDataRow(5, timestamp, valuesByColumn);
	}

	private static ParsedMeasurementValue value(int columnIndex, String rawValue, Double numericValue, ValueStatus status) {
		return new ParsedMeasurementValue(columnIndex, rawValue, numericValue, status);
	}

	private static MeasurementVariableResolutionResult variables(MeasurementVariable... variables) {
		Map<Integer, MeasurementVariable> byColumn = new LinkedHashMap<>();
		for (int index = 0; index < variables.length; index++) {
			byColumn.put(index + 1, variables[index]);
		}
		return new MeasurementVariableResolutionResult(byColumn, 0, variables.length, 0, 0);
	}

	private static MeasurementVariable variable(Long id, String code) {
		return MeasurementVariable.builder()
				.id(id)
				.station(Station.builder().id(1L).code("mto_yazid").name("MTO Yazid").build())
				.code(code)
				.build();
	}

	private static Instant toInstant(LocalDateTime timestamp) {
		return timestamp.atZone(SOURCE_ZONE).toInstant();
	}
}
