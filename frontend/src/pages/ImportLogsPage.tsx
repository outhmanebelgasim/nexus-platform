import { ClipboardList, Clock, Database, RefreshCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { ImportLogTable } from "@/components/importLogs/ImportLogTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { SearchInput } from "@/components/shared/SearchInput";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useImportLogs } from "@/hooks/useImportLogs";
import type { ImportStatus } from "@/types/importLog";
import { formatDateTime } from "@/utils/format";

export function ImportLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<ImportStatus | "ALL">("ALL");
  const { importLogs, isLoading, error, loadImportLogs } = useImportLogs();

  const visibleLogs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return importLogs.filter((log) => {
      const matchesStatus = status === "ALL" || log.status === status;
      const matchesQuery =
        !normalizedQuery ||
        [log.fileName, log.batchId, log.errorMessage]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [importLogs, searchQuery, status]);
  const logsPagination = useClientPagination(visibleLogs, 10);
  const latestRun = [...importLogs].sort((first, second) => (first.startedAt ?? "").localeCompare(second.startedAt ?? "")).at(-1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Importer Operations"
        title="Import logs"
        description="Track .dat file ingestion runs, imported records, skipped rows and backend-reported errors."
        icon={ClipboardList}
        actions={
          <Button type="button" variant="outline" onClick={loadImportLogs} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Executions" value={importLogs.length} description="Importer runs returned" icon={ClipboardList} />
          <MetricCard title="Imported records" value={importLogs.reduce((total, log) => total + (log.importedRows ?? 0), 0).toLocaleString()} description="Across returned runs" icon={Database} />
          <MetricCard title="Failed runs" value={importLogs.filter((log) => log.status === "FAILED").length} description="Runs with backend errors" icon={XCircle} />
          <MetricCard title="Latest run" value={latestRun ? formatDateTime(latestRun.startedAt) : "No runs"} description="Most recent importer execution" icon={Clock} />
        </div>
      </PageHeader>

      {error ? <Alert>{error}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Importer execution history</CardTitle>
            <CardDescription>{visibleLogs.length} runs shown</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px] lg:w-[520px]">
            <SearchInput placeholder="Search imports..." value={searchQuery} onChange={(value) => { setSearchQuery(value); logsPagination.resetPage(); }} />
            <Select value={status} onChange={(event) => { setStatus(event.target.value as ImportStatus | "ALL"); logsPagination.resetPage(); }}>
              <option value="ALL">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PARTIAL_SUCCESS">Partial success</option>
              <option value="FAILED">Failed</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No import logs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No importer executions are available for the current filters. If the importer has not started yet, this page will remain empty until
                the first .dat ingestion run is recorded by the backend.
              </p>
            </div>
          ) : (
            <ImportLogTable importLogs={logsPagination.paginatedItems} />
          )}
          {visibleLogs.length > 0 ? (
            <div className="mt-4">
              <PaginationControls
                page={logsPagination.page}
                totalPages={logsPagination.totalPages}
                totalItems={logsPagination.totalItems}
                pageSize={logsPagination.pageSize}
                label="runs"
                onPageChange={logsPagination.setPage}
                onPageSizeChange={logsPagination.setPageSize}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
