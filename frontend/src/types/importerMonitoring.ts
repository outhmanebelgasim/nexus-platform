export type ImportStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";

export interface ImporterStatus {
  lastExecution: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  successCount: number;
  partialSuccessCount: number;
  failedCount: number;
  trackedFileCount: number;
  stationCount: number;
  variableCount: number;
  measurementCount: number;
}

export interface ImporterLog {
  id: number;
  batchId: string;
  fileName: string;
  displayPath: string | null;
  status: ImportStatus;
  totalRows: number | null;
  importedRows: number | null;
  skippedRows: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ImporterLogPage {
  content: ImporterLog[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ImporterLogFilters {
  status?: ImportStatus;
  filename?: string;
  start?: string;
  end?: string;
  page?: number;
  size?: number;
}

export interface ImporterFileState {
  fileName: string;
  displayPath: string | null;
  sizeBytes: number;
  lastModifiedAt: string | null;
  lastProcessedLine: number | null;
  lastProcessedTimestamp: string | null;
  lastSuccessfulBatchId: string | null;
  updatedAt: string | null;
}
