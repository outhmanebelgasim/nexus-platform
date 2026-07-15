package com.nexus.importer.scheduling;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileScanner;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.DatFileParser;
import com.nexus.importer.station.ResolvedStation;
import com.nexus.importer.station.StationDiscoveryService;

@Component
@ConditionalOnProperty(prefix = "nexus.importer", name = "enabled", havingValue = "true")
public class ImporterScheduler {

	private static final Logger log = LoggerFactory.getLogger(ImporterScheduler.class);

	private final DatFileScanner datFileScanner;
	private final DatFileParser datFileParser;
	private final StationDiscoveryService stationDiscoveryService;

	public ImporterScheduler(
			DatFileScanner datFileScanner,
			DatFileParser datFileParser,
			StationDiscoveryService stationDiscoveryService) {
		this.datFileScanner = datFileScanner;
		this.datFileParser = datFileParser;
		this.stationDiscoveryService = stationDiscoveryService;
	}

	@Scheduled(
			fixedDelayString = "${nexus.importer.scan-delay}",
			initialDelayString = "${nexus.importer.initial-delay}")
	public void scanForDatFiles() {
		try {
			List<DatFileDescriptor> discoveredFiles = datFileScanner.scan();
			if (discoveredFiles.isEmpty()) {
				log.info("No supported DAT files discovered");
				return;
			}

			for (DatFileDescriptor discoveredFile : discoveredFiles) {
				ParsedDatFile parsedFile = datFileParser.parse(discoveredFile);
				if (parsedFile.variables().isEmpty()) {
					log.warn("Skipped DAT file filename={} stationCode={} parseIssues={} path={}",
							discoveredFile.originalFilename(),
							discoveredFile.stationCode(),
							parsedFile.issues().size(),
							discoveredFile.path());
					continue;
				}

				ResolvedStation resolvedStation = stationDiscoveryService.resolve(discoveredFile);
				log.info("Parsed DAT file filename={} stationCode={} classification={} stationResolution={} variableCount={} validRowCount={} skippedRowCount={} missingValueCount={} invalidValueCount={} parseIssueCount={} path={}",
						discoveredFile.originalFilename(),
						discoveredFile.stationCode(),
						discoveredFile.fileType(),
						resolvedStation.created() ? "created" : "existing",
						parsedFile.variables().stream().filter(variable -> !variable.timestampColumn()).count(),
						parsedFile.rows().size(),
						parsedFile.skippedRowCount(),
						parsedFile.missingValueCount(),
						parsedFile.invalidValueCount(),
						parsedFile.issues().size(),
						discoveredFile.path());
			}
		}
		catch (Exception ex) {
			log.error("DAT file discovery failed", ex);
		}
	}

}
