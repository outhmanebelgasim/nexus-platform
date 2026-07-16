package com.nexus.importer.scheduling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.repository.ImporterMeasurementRepository;
import com.nexus.importer.repository.ImporterMeasurementVariableRepository;
import com.nexus.importer.repository.StationMeasurementStats;
import com.nexus.importer.state.FileImportMetadata;
import com.nexus.importer.state.ImportFileState;
import com.nexus.importer.state.ImportStateDecision;
import com.nexus.importer.station.ResolvedStation;

class ImportRecoveryDecisionServiceTest {

	private static final DatFileDescriptor DESCRIPTOR = new DatFileDescriptor(
			Path.of("/tmp/MTO_yazid.dat"),
			"MTO_yazid.dat",
			"mto_yazid",
			DatFileType.THIRTY_MINUTE);

	private final ImporterMeasurementVariableRepository variableRepository =
			org.mockito.Mockito.mock(ImporterMeasurementVariableRepository.class);
	private final ImporterMeasurementRepository measurementRepository =
			org.mockito.Mockito.mock(ImporterMeasurementRepository.class);
	private final ImportRecoveryDecisionService service = new ImportRecoveryDecisionService(
			variableRepository,
			measurementRepository,
			properties());

	@Test
	void changedFileRequiresImportAfterDatabaseConsistencyPasses() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of(variable("AirTC_Avg")));
		when(measurementRepository.summarizeByStationId(1L)).thenReturn(stats(
				Instant.parse("2026-05-08T11:30:00Z"),
				Instant.parse("2026-07-16T11:30:00Z"),
				2));

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(false),
				parsedFile(header("AirTC_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isFalse();
		assertThat(decision.reason()).isEqualTo("checkpoint-not-unchanged");
	}

	@Test
	void newlyCreatedStationRequiresImportEvenWhenCheckpointLooksUnchanged() {
		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				new ResolvedStation(station(), true),
				decision(true),
				parsedFile(header("AirTC_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isTrue();
		assertThat(decision.reason()).isEqualTo("station-created");
	}

	@Test
	void existingStationWithNoVariablesRequiresImport() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of());

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(true),
				parsedFile(header("AirTC_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isTrue();
		assertThat(decision.reason()).isEqualTo("station-has-no-variables");
	}

	@Test
	void unchangedFileWithMissingHeaderVariableRequiresRecoveryImport() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of(variable("AirTC_Avg")));

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(true),
				parsedFile(header("AirTC_Avg"), header("RH_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isTrue();
		assertThat(decision.reason()).isEqualTo("missing-header-variable");
	}

	@Test
	void healthyUnchangedFileSkipsFullImport() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of(variable("AirTC_Avg"), variable("RH_Avg")));
		when(measurementRepository.summarizeByStationId(1L)).thenReturn(stats(
				Instant.parse("2026-05-08T11:30:00Z"),
				Instant.parse("2026-07-16T11:30:00Z"),
				2));

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(true),
				parsedFile(header("airtc_avg"), header("RH_Avg")),
				"signature");

		assertThat(decision.importRequired()).isFalse();
		assertThat(decision.reason()).isEqualTo("unchanged-healthy");
	}

	@Test
	void databaseEarliestAfterFileEarliestRequiresFullHistoricalBackfill() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of(variable("AirTC_Avg")));
		when(measurementRepository.summarizeByStationId(1L)).thenReturn(stats(
				Instant.parse("2026-07-16T11:30:00Z"),
				Instant.parse("2026-07-16T11:30:00Z"),
				1));

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(true),
				parsedFile(header("AirTC_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isTrue();
		assertThat(decision.reason()).isEqualTo("database-earliest-after-file-earliest");
	}

	@Test
	void checkpointTimestampAfterDatabaseLatestRequiresFullHistoricalBackfill() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of(variable("AirTC_Avg")));
		when(measurementRepository.summarizeByStationId(1L)).thenReturn(stats(
				Instant.parse("2026-05-08T11:30:00Z"),
				Instant.parse("2026-07-16T10:30:00Z"),
				2));
		ImportFileState existingState = state();
		existingState.setLastProcessedTimestamp(Instant.parse("2026-07-16T11:30:00Z"));

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(true, existingState),
				parsedFile(header("AirTC_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isTrue();
		assertThat(decision.reason()).isEqualTo("checkpoint-timestamp-after-database-latest");
	}

	@Test
	void unchangedFileWithRowsButNoMeasurementsRequiresFullHistoricalBackfill() {
		when(variableRepository.findByStationId(1L)).thenReturn(List.of(variable("AirTC_Avg")));
		when(measurementRepository.summarizeByStationId(1L)).thenReturn(stats(null, null, 0));

		ImportRecoveryDecision decision = service.decide(
				DESCRIPTOR,
				existingStation(),
				decision(true),
				parsedFile(header("AirTC_Avg")),
				"signature");

		assertThat(decision.importRequired()).isTrue();
		assertThat(decision.forceFullRescan()).isTrue();
		assertThat(decision.reason()).isEqualTo("station-has-no-measurements");
	}

	private static ResolvedStation existingStation() {
		return new ResolvedStation(station(), false);
	}

	private static Station station() {
		return Station.builder()
				.id(1L)
				.code("mto_yazid")
				.name("MTO Yazid")
				.build();
	}

	private static MeasurementVariable variable(String code) {
		return MeasurementVariable.builder()
				.id((long) code.hashCode())
				.code(code)
				.build();
	}

	private static ImportStateDecision decision(boolean unchanged) {
		return decision(unchanged, state());
	}

	private static ImportStateDecision decision(boolean unchanged, ImportFileState existingState) {
		return new ImportStateDecision(
				new FileImportMetadata(
						"/tmp/MTO_yazid.dat",
						"MTO_yazid.dat",
						Instant.parse("2026-07-16T12:00:00Z"),
						100),
				existingState,
				unchanged);
	}

	private static ImportFileState state() {
		return ImportFileState.builder()
				.fileKey("/tmp/MTO_yazid.dat")
				.fileName("MTO_yazid.dat")
				.lastModifiedAt(Instant.parse("2026-07-16T12:00:00Z"))
				.fileSizeBytes(100)
				.headerSignature("signature")
				.build();
	}

	private static ParsedDatFile parsedFile(ParsedVariableHeader... headers) {
		java.util.ArrayList<ParsedVariableHeader> allHeaders = new java.util.ArrayList<>();
		allHeaders.add(new ParsedVariableHeader(0, "TIMESTAMP", "TS", "", true));
		allHeaders.addAll(List.of(headers));
		return new ParsedDatFile(
				DESCRIPTOR,
				allHeaders,
				List.of(
						new ParsedDataRow(5, LocalDateTime.of(2026, 5, 8, 12, 30), Map.of()),
						new ParsedDataRow(6, LocalDateTime.of(2026, 7, 16, 12, 30), Map.of())),
				List.of());
	}

	private static ParsedVariableHeader header(String code) {
		return new ParsedVariableHeader(1, code, "Deg C", "Avg", false);
	}

	private static StationMeasurementStats stats(Instant earliest, Instant latest, long count) {
		return new StationMeasurementStats() {
			@Override
			public Instant getEarliestMeasuredAt() {
				return earliest;
			}

			@Override
			public Instant getLatestMeasuredAt() {
				return latest;
			}

			@Override
			public long getMeasurementCount() {
				return count;
			}
		};
	}

	private static NexusImporterProperties properties() {
		return new NexusImporterProperties(
				Path.of("/tmp"),
				true,
				Duration.ofMinutes(30),
				Duration.ofSeconds(10),
				Duration.ofMinutes(2),
				ZoneId.of("Africa/Casablanca"),
				500);
	}
}
