package com.nexus.importer.file;

import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

@Component
public class DatFileMetadataParser {

	private static final Pattern ET0_OR_MTO_PATTERN = Pattern.compile(
			"^(ET0|MTO)_([^_].*)\\.dat$",
			Pattern.CASE_INSENSITIVE);

	private static final Pattern FOS_PATTERN = Pattern.compile(
			"^FOS_([^_].*)_humidite_sol_All.*\\.dat$",
			Pattern.CASE_INSENSITIVE);

	public Optional<DatFileDescriptor> parse(Path path) {
		String originalFilename = path.getFileName().toString();

		Matcher et0OrMtoMatcher = ET0_OR_MTO_PATTERN.matcher(originalFilename);
		if (et0OrMtoMatcher.matches()) {
			String prefix = normalize(et0OrMtoMatcher.group(1));
			String site = normalize(et0OrMtoMatcher.group(2));
			if (site.isBlank()) {
				return Optional.empty();
			}
			DatFileType fileType = "et0".equals(prefix) ? DatFileType.ET0_DAILY : DatFileType.THIRTY_MINUTE;
			return Optional.of(new DatFileDescriptor(path, originalFilename, prefix + "_" + site, fileType));
		}

		Matcher fosMatcher = FOS_PATTERN.matcher(originalFilename);
		if (fosMatcher.matches()) {
			String site = normalize(fosMatcher.group(1));
			if (site.isBlank()) {
				return Optional.empty();
			}
			return Optional.of(new DatFileDescriptor(path, originalFilename, "fos_" + site, DatFileType.THIRTY_MINUTE));
		}

		return Optional.empty();
	}

	private static String normalize(String value) {
		return value.trim()
				.toLowerCase(Locale.ROOT)
				.replaceAll("[\\s-]+", "_")
				.replaceAll("_+", "_")
				.replaceAll("^_|_$", "");
	}

}
