package com.nexus.importer.file;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.nexus.importer.config.NexusImporterProperties;

@Service
public class DatFileScanner {

	private static final Logger log = LoggerFactory.getLogger(DatFileScanner.class);

	private final NexusImporterProperties properties;
	private final DatFileMetadataParser metadataParser;
	private final Clock clock;

	@Autowired
	public DatFileScanner(NexusImporterProperties properties, DatFileMetadataParser metadataParser) {
		this(properties, metadataParser, Clock.systemUTC());
	}

	DatFileScanner(NexusImporterProperties properties, DatFileMetadataParser metadataParser, Clock clock) {
		this.properties = properties;
		this.metadataParser = metadataParser;
		this.clock = clock;
	}

	public List<DatFileDescriptor> scan() throws IOException {
		Path inputDirectory = properties.inputDirectory();
		validateInputDirectory(inputDirectory);

		Instant oldestAllowedModificationTime = clock.instant().minus(properties.minimumFileAge());

		try (Stream<Path> paths = Files.list(inputDirectory)) {
			return paths
					.filter(Files::isRegularFile)
					.filter(path -> isReadyForScanning(path, oldestAllowedModificationTime))
					.filter(DatFileScanner::isDatFile)
					.filter(path -> !isModemDatFile(path))
					.sorted(Comparator.comparing(path -> path.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
					.map(this::parseDescriptor)
					.flatMap(Optional::stream)
					.toList();
		}
	}

	private Optional<DatFileDescriptor> parseDescriptor(Path path) {
		Optional<DatFileDescriptor> descriptor = metadataParser.parse(path);
		if (descriptor.isEmpty()) {
			log.warn("Skipping unsupported DAT filename={}", fileName(path));
		}
		return descriptor;
	}

	private void validateInputDirectory(Path inputDirectory) {
		if (!Files.exists(inputDirectory)) {
			throw new IllegalStateException("Importer input directory does not exist: " + inputDirectory);
		}
		if (!Files.isDirectory(inputDirectory)) {
			throw new IllegalStateException("Importer input path is not a directory: " + inputDirectory);
		}
		if (!Files.isReadable(inputDirectory)) {
			throw new IllegalStateException("Importer input directory is not readable: " + inputDirectory);
		}
	}

	private boolean isReadyForScanning(Path path, Instant oldestAllowedModificationTime) {
		try {
			return Files.getLastModifiedTime(path).toInstant().isBefore(oldestAllowedModificationTime);
		}
		catch (IOException ex) {
			return false;
		}
	}

	private static boolean isDatFile(Path path) {
		return fileName(path).toLowerCase(Locale.ROOT).endsWith(".dat");
	}

	private static boolean isModemDatFile(Path path) {
		return fileName(path).toLowerCase(Locale.ROOT).endsWith("_modem.dat");
	}

	private static String fileName(Path path) {
		return path.getFileName().toString();
	}

}
