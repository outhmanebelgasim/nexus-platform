package com.nexus.platform.mapper;

import com.nexus.domain.entity.ImportLog;
import com.nexus.platform.dto.importlog.ImportLogRequest;
import com.nexus.platform.dto.importlog.ImportLogResponse;

import java.util.List;

public final class ImportLogMapper {

    private ImportLogMapper() {
    }

    public static ImportLog toEntity(ImportLogRequest request) {
        if (request == null) {
            return null;
        }

        return ImportLog.builder()
                .batchId(request.batchId())
                .fileName(request.fileName())
                .filePath(request.filePath())
                .status(request.status())
                .totalRows(request.totalRows())
                .importedRows(request.importedRows())
                .skippedRows(request.skippedRows())
                .errorMessage(request.errorMessage())
                .build();
    }

    public static ImportLogResponse toResponse(ImportLog importLog) {
        if (importLog == null) {
            return null;
        }

        return new ImportLogResponse(
                importLog.getId(),
                importLog.getBatchId(),
                importLog.getFileName(),
                importLog.getFilePath(),
                importLog.getStatus(),
                importLog.getTotalRows(),
                importLog.getImportedRows(),
                importLog.getSkippedRows(),
                importLog.getErrorMessage(),
                importLog.getStartedAt(),
                importLog.getFinishedAt()
        );
    }

    public static List<ImportLogResponse> toResponseList(List<ImportLog> importLogs) {
        if (importLogs == null) {
            return List.of();
        }

        return importLogs.stream()
                .map(ImportLogMapper::toResponse)
                .toList();
    }
}
