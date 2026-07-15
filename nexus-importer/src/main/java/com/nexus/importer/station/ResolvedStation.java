package com.nexus.importer.station;

import com.nexus.domain.entity.Station;

public record ResolvedStation(Station station, boolean created) {
}
