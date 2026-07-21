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

		String basename = removeDatExtension(originalFilename);
		String[] segments = basename.split("_", -1);
		if (segments.length < 2) {
			return Optional.empty();
		}

		String prefix = segments[0].trim();
		if (!isValidPrefix(prefix) || basename.isBlank() || basename.endsWith("_")) {
			return Optional.empty();
		}

		String normalizedPrefix = prefix.toLowerCase(Locale.ROOT);
		DatFileType fileType = "et0".equals(normalizedPrefix) ? DatFileType.ET0_DAILY : DatFileType.THIRTY_MINUTE;
		return Optional.of(new DatFileDescriptor(
				path,
				originalFilename,
				basename.toLowerCase(Locale.ROOT),
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
