package com.nexus.importer.state;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.repository.ImporterImportFileStateRepository;

@Service
public class ImportFileStateService {

	private final ImporterImportFileStateRepository repository;
	private final NexusImporterProperties properties;
	private final Clock clock;

	@Autowired
	public ImportFileStateService(ImporterImportFileStateRepository repository, NexusImporterProperties properties) {
		this(repository, properties, Clock.systemUTC());
	}

	ImportFileStateService(ImporterImportFileStateRepository repository, NexusImporterProperties properties, Clock clock) {
		this.repository = repository;
		this.properties = properties;
		this.clock = clock;
	}

	public ImportStateDecision prepare(DatFileDescriptor descriptor) {
		FileImportMetadata metadata = metadata(descriptor);
		Optional<ImportFileState> state = repository.findByFileKey(metadata.fileKey());
		boolean unchanged = state
				.map(existing -> existing.getFileSizeBytes() == metadata.fileSizeBytes()
						&& existing.getLastModifiedAt().equals(metadata.lastModifiedAt()))
				.orElse(false);
		return new ImportStateDecision(metadata, state.orElse(null), unchanged);
	}

	public CheckpointedParsedFile applyCheckpoint(ParsedDatFile parsedFile, ImportStateDecision decision) {
		return applyCheckpoint(parsedFile, decision, false);
	}

	public CheckpointedParsedFile applyCheckpoint(
			ParsedDatFile parsedFile,
			ImportStateDecision decision,
			boolean forceFullRescan) {
		String headerSignature = headerSignature(parsedFile);
		ImportFileState state = decision.existingState();
		if (state == null || parsedFile.variables().isEmpty()) {
			return new CheckpointedParsedFile(parsedFile, parsedFile, headerSignature, false, state != null);
		}

		if (forceFullRescan) {
			return new CheckpointedParsedFile(parsedFile, parsedFile, headerSignature, false, true);
		}

		boolean headerChanged = !headerSignature.equals(state.getHeaderSignature());
		boolean truncatedOrReplaced = decision.metadata().fileSizeBytes() < state.getFileSizeBytes();
		if (headerChanged || truncatedOrReplaced) {
			return new CheckpointedParsedFile(parsedFile, parsedFile, headerSignature, false, true);
		}

		boolean grown = decision.metadata().fileSizeBytes() > state.getFileSizeBytes();
		if (grown && state.getLastProcessedPhysicalLine() != null) {
			long lastLine = state.getLastProcessedPhysicalLine();
			List<ParsedDataRow> newRows = parsedFile.rows().stream()
					.filter(row -> row.physicalLineNumber() > lastLine)
					.toList();
			ParsedDatFile fileForImport = new ParsedDatFile(
					parsedFile.descriptor(),
					parsedFile.variables(),
					newRows,
					parsedFile.issues());
			return new CheckpointedParsedFile(fileForImport, parsedFile, headerSignature, true, false);
		}

		return new CheckpointedParsedFile(parsedFile, parsedFile, headerSignature, false, false);
	}

	public String headerSignature(ParsedDatFile parsedFile) {
		return headerSignature(parsedFile.variables());
	}

	public void markSuccessful(
			DatFileDescriptor descriptor,
			CheckpointedParsedFile checkpointedFile,
			ImportStateDecision decision,
			UUID batchId) {
		FileImportMetadata metadata = decision.metadata();
		ImportFileState state = repository.findByFileKey(metadata.fileKey())
				.orElseGet(() -> ImportFileState.builder()
						.fileKey(metadata.fileKey())
						.build());

		state.setFileName(descriptor.originalFilename());
		state.setLastModifiedAt(metadata.lastModifiedAt());
		state.setFileSizeBytes(metadata.fileSizeBytes());
		state.setHeaderSignature(checkpointedFile.headerSignature());
		state.setLastProcessedPhysicalLine(lastProcessedPhysicalLine(checkpointedFile.fullFile()));
		state.setLastProcessedTimestamp(lastProcessedTimestamp(checkpointedFile.fullFile()));
		state.setLastSuccessfulBatchId(batchId);
		state.setUpdatedAt(clock.instant());
		repository.save(state);
	}

	private FileImportMetadata metadata(DatFileDescriptor descriptor) {
		try {
			Path normalizedPath = descriptor.path().toAbsolutePath().normalize();
			return new FileImportMetadata(
						normalizedPath.toString(),
						descriptor.originalFilename(),
						normalizeFileTimestamp(Files.getLastModifiedTime(descriptor.path()).toInstant()),
						Files.size(descriptor.path()));
		}
		catch (IOException ex) {
			throw new IllegalStateException("Unable to read DAT file metadata: " + descriptor.path(), ex);
		}
	}

	private Long lastProcessedPhysicalLine(ParsedDatFile parsedFile) {
		return parsedFile.rows().stream()
				.map(ParsedDataRow::physicalLineNumber)
				.max(Comparator.naturalOrder())
				.orElse(null);
	}

	private Instant lastProcessedTimestamp(ParsedDatFile parsedFile) {
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

	private Instant normalizeFileTimestamp(Instant timestamp) {
		return timestamp.truncatedTo(ChronoUnit.MICROS);
	}

	private String headerSignature(List<ParsedVariableHeader> variables) {
		String joined = variables.stream()
				.map(variable -> variable.columnIndex()
						+ "|" + variable.code()
						+ "|" + variable.unit()
						+ "|" + variable.aggregation()
						+ "|" + variable.timestampColumn())
				.reduce((left, right) -> left + "\n" + right)
				.orElse("");
		try {
			return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
					.digest(joined.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is not available", ex);
		}
	}
}
