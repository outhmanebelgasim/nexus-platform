package com.nexus.platform.dto.importer;

import java.util.List;

public record ImporterLogPageResponse(
        List<ImporterLogResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
