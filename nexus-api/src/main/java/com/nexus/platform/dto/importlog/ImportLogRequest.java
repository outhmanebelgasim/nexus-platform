package com.nexus.platform.dto.importlog;

import com.nexus.domain.enums.ImportStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ImportLogRequest(
        @NotNull
        UUID batchId,

        @NotBlank
        @Size(max = 255)
        String fileName,

        String filePath,

        @NotNull
        ImportStatus status,

        Integer totalRows,
        Integer importedRows,
        Integer skippedRows,
        String errorMessage
) {
}
