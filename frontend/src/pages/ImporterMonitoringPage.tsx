import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Database, FileClock, RefreshCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { SearchInput } from "@/components/shared/SearchInput";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useImporterMonitoring } from "@/hooks/useImporterMonitoring";
import type { ImportStatus, ImporterLogFilters } from "@/types/importerMonitoring";
import { formatDateTime } from "@/utils/format";

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function getDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) {
    return "In progress";
  }

  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return "Not available";
  }

  return `${Math.round(durationMs / 1000).toLocaleString()}s`;
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value.toLocaleString()} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
  }
  return `${(value / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
}

export function ImporterMonitoringPage() {
  const [statusFilter, setStatusFilter] = useState<ImportStatus | "ALL">("ALL");
  const [filename, setFilename] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filters = useMemo<ImporterLogFilters>(
    () => ({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      filename: filename.trim() || undefined,
      start: toIsoDateTime(start),
      end: toIsoDateTime(end),
      page,
      size: pageSize,
    }),
    [end, filename, page, pageSize, start, statusFilter],
  );
  const { status, logs, files, isLoading, error, loadMonitoring } = useImporterMonitoring(filters);
  const filesPagination = useClientPagination(files, 10);

  const resetToFirstPage = (updates: () => void) => {
    setPage(0);
    updates();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Importer Operations"
        title="Import monitoring"
        description="Review importer health, recent execution outcomes and tracked file checkpoints from the database."
        icon={ClipboardList}
        actions={
          <Button type="button" variant="outline" onClick={loadMonitoring} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Last execution" value={formatDateTime(status?.lastExecution)} description="Most recent completed importer run" icon={Clock} />
          <MetricCard title="Tracked files" value={status?.trackedFileCount ?? 0} description="Checkpointed source files" icon={FileClock} />
          <MetricCard title="Variables" value={status?.variableCount ?? 0} description="Dynamic measurement variables" icon={Database} />
          <MetricCard title="Measurements" value={(status?.measurementCount ?? 0).toLocaleString()} description="Imported readings in storage" icon={Database} />
        </div>
      </PageHeader>

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Successful runs" value={status?.successCount ?? 0} description={formatDateTime(status?.lastSuccess)} icon={CheckCircle2} />
        <MetricCard title="Partial runs" value={status?.partialSuccessCount ?? 0} description="Completed with skipped or invalid rows" icon={AlertTriangle} />
        <MetricCard title="Failed runs" value={status?.failedCount ?? 0} description={formatDateTime(status?.lastFailure)} icon={XCircle} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Recent import logs</CardTitle>
            <CardDescription>{logs.totalElements.toLocaleString()} executions match the current filters</CardDescription>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <SearchInput id="filename" placeholder="Search file name" value={filename} onChange={(value) => resetToFirstPage(() => setFilename(value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={statusFilter} onChange={(event) => resetToFirstPage(() => setStatusFilter(event.target.value as ImportStatus | "ALL"))}>
                <option value="ALL">All statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PARTIAL_SUCCESS">Partial success</option>
                <option value="FAILED">Failed</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="datetime-local" value={start} onChange={(event) => resetToFirstPage(() => setStart(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="datetime-local" value={end} onChange={(event) => resetToFirstPage(() => setEnd(event.target.value))} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingState />
          ) : logs.content.length === 0 ? (
            <EmptyState title="No import logs found" description="Adjust the filters or wait for the importer to record new .dat processing runs." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.content.map((log) => (
                  <TableRow key={log.id} className="hover:bg-accent/30">
                    <TableCell>
                      <p className="font-medium">{log.fileName}</p>
                      <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{log.batchId}</p>
                    </TableCell>
                    <TableCell>
                      <OperationalBadge value={log.status} />
                    </TableCell>
                    <TableCell>{getDuration(log.startedAt, log.finishedAt)}</TableCell>
                    <TableCell>
                      {(log.importedRows ?? 0).toLocaleString()} imported
                      <span className="block text-xs text-muted-foreground">{(log.skippedRows ?? 0).toLocaleString()} skipped</span>
                    </TableCell>
                    <TableCell>{formatDateTime(log.startedAt)}</TableCell>
                    <TableCell className="max-w-sm">
                      {log.errorMessage ? <span className="text-destructive">{log.errorMessage}</span> : <span className="text-muted-foreground">None reported</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <PaginationControls
            page={logs.page}
            totalPages={logs.totalPages}
            totalItems={logs.totalElements}
            pageSize={pageSize}
            isLoading={isLoading}
            label="runs"
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Tracked import files</CardTitle>
          <CardDescription>{files.length.toLocaleString()} checkpoint records returned by the API</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rowClassName="h-14" />
          ) : files.length === 0 ? (
            <EmptyState title="No tracked files" description="The importer has not recorded checkpoint state yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last modified</TableHead>
                  <TableHead>Checkpoint</TableHead>
                  <TableHead>Last batch</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filesPagination.paginatedItems.map((file) => (
                  <TableRow key={file.fileName} className="hover:bg-accent/30">
                    <TableCell>
                      <p className="font-medium">{file.fileName}</p>
                      <p className="max-w-[16rem] truncate text-xs text-muted-foreground">{file.displayPath ?? file.fileName}</p>
                    </TableCell>
                    <TableCell>{formatBytes(file.sizeBytes)}</TableCell>
                    <TableCell>{formatDateTime(file.lastModifiedAt)}</TableCell>
                    <TableCell>
                      Line {file.lastProcessedLine?.toLocaleString() ?? "not started"}
                      <span className="block text-xs text-muted-foreground">{formatDateTime(file.lastProcessedTimestamp)}</span>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-muted-foreground">{file.lastSuccessfulBatchId ?? "Not available"}</TableCell>
                    <TableCell>{formatDateTime(file.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {files.length > 0 ? (
            <div className="mt-4">
              <PaginationControls
                page={filesPagination.page}
                totalPages={filesPagination.totalPages}
                totalItems={filesPagination.totalItems}
                pageSize={filesPagination.pageSize}
                label="files"
                onPageChange={filesPagination.setPage}
                onPageSizeChange={filesPagination.setPageSize}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
