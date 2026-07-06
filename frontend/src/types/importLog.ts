export type ImportStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";

export interface ImportLog {
  id: number;
  batchId: string;
  fileName: string;
  filePath: string | null;
  status: ImportStatus;
  totalRows: number | null;
  importedRows: number | null;
  skippedRows: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}
