import { MapPin } from "lucide-react";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Farm } from "@/types/farm";
import type { Station } from "@/types/station";
import { formatDateTime } from "@/utils/format";
import { getFarmName } from "@/utils/labels";

interface StationTableProps {
  stations: Station[];
  farms: Farm[];
  isSaving: boolean;
  onEdit?: (station: Station) => void;
  onDelete?: (station: Station) => void;
}

function coordinates(station: Station) {
  if (station.latitude == null || station.longitude == null) {
    return "Coordinates not set";
  }

  return `${station.latitude}, ${station.longitude}`;
}

export function StationTable({ stations, farms, isSaving, onEdit, onDelete }: StationTableProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {stations.map((station) => (
          <article key={station.id} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/20">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{station.name}</h3>
                  <p className="text-sm text-muted-foreground">{station.code}</p>
                </div>
                <StatusBadge status={station.status} />
              </div>
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Farm: </span>
                  {getFarmName(farms, station.farmId)}
                </p>
                <p className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {coordinates(station)}
                </p>
                <p>
                  <span className="text-muted-foreground">Created: </span>
                  {formatDateTime(station.createdAt)}
                </p>
              </div>
              {onEdit && onDelete ? <div className="grid grid-cols-2 gap-2">
                <ActionIconButton action="edit" label="Edit station" showLabel onClick={() => onEdit(station)} disabled={isSaving} />
                <ActionIconButton action="delete" label="Delete station" showLabel onClick={() => onDelete(station)} disabled={isSaving} />
              </div> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Farm</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Created</TableHead>
              {onEdit && onDelete ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((station) => (
              <TableRow key={station.id} className="hover:bg-accent/30">
                <TableCell>
                  <p className="font-medium">{station.name}</p>
                  <p className="text-sm text-muted-foreground">{station.code}</p>
                </TableCell>
                <TableCell>{getFarmName(farms, station.farmId)}</TableCell>
                <TableCell>
                  <StatusBadge status={station.status} />
                </TableCell>
                <TableCell>{coordinates(station)}</TableCell>
                <TableCell>{formatDateTime(station.createdAt)}</TableCell>
                {onEdit && onDelete ? <TableCell>
                  <div className="flex justify-end gap-2">
                    <ActionIconButton action="edit" label="Edit station" onClick={() => onEdit(station)} disabled={isSaving} />
                    <ActionIconButton action="delete" label="Delete station" onClick={() => onDelete(station)} disabled={isSaving} />
                  </div>
                </TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
