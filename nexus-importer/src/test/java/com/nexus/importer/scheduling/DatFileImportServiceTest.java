package com.nexus.importer.scheduling;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Instant;
import java.time.Duration;
import java.util.UUID;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import com.nexus.domain.entity.Station;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.measurement.MeasurementPersistenceService;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.station.ResolvedStation;
import com.nexus.importer.state.CheckpointedParsedFile;
import com.nexus.importer.state.FileImportMetadata;
import com.nexus.importer.state.ImportFileStateService;
import com.nexus.importer.state.ImportStateDecision;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;
import com.nexus.importer.variable.MeasurementVariableResolutionService;

class DatFileImportServiceTest {

	private final MeasurementVariableResolutionService variableResolutionService = org.mockito.Mockito.mock(MeasurementVariableResolutionService.class);
	private final MeasurementPersistenceService measurementPersistenceService = org.mockito.Mockito.mock(MeasurementPersistenceService.class);
	private final ImportFileStateService importFileStateService = org.mockito.Mockito.mock(ImportFileStateService.class);
	private final DatFileImportService service = new DatFileImportService(
			variableResolutionService,
			measurementPersistenceService,
			importFileStateService);
	private static final UUID BATCH_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant STARTED_AT = Instant.parse("2026-07-16T12:00:00Z");

	@Test
	void propagatesMeasurementFailureSoFileTransactionCanRollback() {
		Station station = Station.builder().id(1L).code("mto_yazid").name("MTO Yazid").build();
		ParsedDatFile parsedFile = parsedFile();
		MeasurementVariableResolutionResult variables = new MeasurementVariableResolutionResult(Map.of(), 0, 0, 0, 0);
		when(variableResolutionService.resolve(station, parsedFile)).thenReturn(variables);
		when(measurementPersistenceService.persist(any(), any(), any()))
				.thenThrow(new DataAccessResourceFailureException("database unavailable"));

		assertThatThrownBy(() -> service.importFile(descriptor(), new ResolvedStation(station, false), checkpointed(parsedFile), decision(), BATCH_ID, STARTED_AT))
				.isInstanceOf(DataAccessResourceFailureException.class);
		verify(variableResolutionService).resolve(station, parsedFile);
		verify(importFileStateService, never()).markSuccessful(any(), any(), any(), any());
	}

	@Test
	void importsMeasurementsAfterVariableResolution() {
		Station station = Station.builder().id(1L).code("mto_yazid").name("MTO Yazid").build();
		ParsedDatFile parsedFile = parsedFile();
		MeasurementVariableResolutionResult variables = new MeasurementVariableResolutionResult(Map.of(), 0, 0, 0, 0);
		when(variableResolutionService.resolve(station, parsedFile)).thenReturn(variables);
		when(measurementPersistenceService.persist(any(), any(), any()))
				.thenReturn(new MeasurementPersistenceResult(0, 0, 0, 0, 0, 0, 0, 0, Duration.ZERO));

		DatFileImportResult result = service.importFile(descriptor(), new ResolvedStation(station, false), checkpointed(parsedFile), decision(), BATCH_ID, STARTED_AT);

		verify(measurementPersistenceService).persist(any(), any(), any());
		verify(importFileStateService).markSuccessful(any(), any(), any(), any());
		org.assertj.core.api.Assertions.assertThat(result.batchId()).isEqualTo(BATCH_ID);
		org.assertj.core.api.Assertions.assertThat(result.startedAt()).isEqualTo(STARTED_AT);
	}

	private static DatFileDescriptor descriptor() {
		return new DatFileDescriptor(Path.of("/tmp/MTO_Yazid.dat"), "MTO_Yazid.dat", "mto_yazid", DatFileType.THIRTY_MINUTE);
	}

	private static ParsedDatFile parsedFile() {
		return new ParsedDatFile(descriptor(), List.of(), List.of(), List.of());
	}

	private static CheckpointedParsedFile checkpointed(ParsedDatFile parsedFile) {
		return new CheckpointedParsedFile(parsedFile, parsedFile, "signature", false, false);
	}

	private static ImportStateDecision decision() {
		return new ImportStateDecision(
				new FileImportMetadata("/tmp/MTO_Yazid.dat", "MTO_Yazid.dat", STARTED_AT, 100),
				null,
				false);
	}
}
