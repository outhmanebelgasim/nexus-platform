package com.nexus.importer.file;

import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Component;

@Component
public class DatFileMetadataParser {

	public Optional<DatFileDescriptor> parse(Path path) {
		String originalFilename = path.getFileName().toString();
		if (!hasDatExtension(originalFilename)) {
			return Optional.empty();
		}

		String[] segments = removeDatExtension(originalFilename).split("_", -1);
		if (segments.length < 2) {
			return Optional.empty();
		}

		String prefix = segments[0].trim();
		String stationName = segments[1].trim();
		if (!isValidPrefix(prefix) || stationName.isBlank()) {
			return Optional.empty();
		}

		String normalizedPrefix = prefix.toLowerCase(Locale.ROOT);
		String normalizedStationName = stationName.toLowerCase(Locale.ROOT);
		DatFileType fileType = "et0".equals(normalizedPrefix) ? DatFileType.ET0_DAILY : DatFileType.THIRTY_MINUTE;
		return Optional.of(new DatFileDescriptor(
				path,
				originalFilename,
				normalizedPrefix + "_" + normalizedStationName,
				fileType));
	}

	private static boolean hasDatExtension(String filename) {
		return filename.toLowerCase(Locale.ROOT).endsWith(".dat");
	}

	private static String removeDatExtension(String filename) {
		return filename.substring(0, filename.length() - ".dat".length());
	}

	private static boolean isValidPrefix(String prefix) {
		if ("et0".equalsIgnoreCase(prefix)) {
			return true;
		}
		return prefix.length() == 3 && prefix.chars().allMatch(Character::isAlphabetic);
	}

}
