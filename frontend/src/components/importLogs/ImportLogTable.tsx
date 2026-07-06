import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportLog } from "@/types/importLog";
import { formatDateTime } from "@/utils/format";

interface ImportLogTableProps {
  importLogs: ImportLog[];
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

export function ImportLogTable({ importLogs }: ImportLogTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Execution</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Imported</TableHead>
          <TableHead>Skipped</TableHead>
          <TableHead>Errors</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {importLogs.map((log) => (
          <TableRow key={log.id} className="hover:bg-accent/30">
            <TableCell>
              <p className="font-medium">{log.fileName}</p>
              <p className="max-w-xs truncate text-sm text-muted-foreground">{log.batchId}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(log.startedAt)}</p>
            </TableCell>
            <TableCell>
              <OperationalBadge value={log.status} />
            </TableCell>
            <TableCell>{getDuration(log.startedAt, log.finishedAt)}</TableCell>
            <TableCell>
              {(log.importedRows ?? 0).toLocaleString()} / {(log.totalRows ?? 0).toLocaleString()}
            </TableCell>
            <TableCell>{(log.skippedRows ?? 0).toLocaleString()}</TableCell>
            <TableCell className="max-w-sm">
              {log.errorMessage ? <span className="text-destructive">{log.errorMessage}</span> : <span className="text-muted-foreground">None reported</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
