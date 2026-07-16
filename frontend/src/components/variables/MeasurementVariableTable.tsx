import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MeasurementVariable } from "@/types/measurementVariable";
import type { Station } from "@/types/station";
import { formatDateTime } from "@/utils/format";
import { getStationName } from "@/utils/labels";

interface MeasurementVariableTableProps {
  variables: MeasurementVariable[];
  stations: Station[];
  canEdit: (variable: MeasurementVariable) => boolean;
  onEdit: (variable: MeasurementVariable) => void;
  onDelete: (variable: MeasurementVariable) => void;
}

function metadata(value: string | null) {
  return value?.trim() || "Not configured";
}

function variableLabel(variable: MeasurementVariable) {
  return variable.displayName?.trim() || variable.code;
}

export function MeasurementVariableTable({ variables, stations, canEdit, onEdit, onDelete }: MeasurementVariableTableProps) {
  return (
    <>
      <div className="grid gap-3 xl:hidden">
        {variables.map((variable) => (
          <article key={variable.id} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-medium">{variableLabel(variable)}</h3>
                <p className="text-sm text-muted-foreground">{variable.code}</p>
              </div>
              <OperationalBadge value={variable.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Station: </span>
                {getStationName(stations, variable.stationId)}
              </p>
              <p>
                <span className="text-muted-foreground">Description: </span>
                {metadata(variable.description)}
              </p>
              <p>
                <span className="text-muted-foreground">Unit: </span>
                {metadata(variable.unit)}
              </p>
              <p>
                <span className="text-muted-foreground">Measurement type: </span>
                {metadata(variable.measurementType)}
              </p>
              <p>
                <span className="text-muted-foreground">First seen: </span>
                {formatDateTime(variable.firstSeenAt)}
              </p>
              <p>
                <span className="text-muted-foreground">Last seen: </span>
                {formatDateTime(variable.lastSeenAt)}
              </p>
            </div>
            {canEdit(variable) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionIconButton action="edit" label="Edit variable metadata" showLabel onClick={() => onEdit(variable)} />
                <ActionIconButton action="delete" label="Delete variable" showLabel onClick={() => onDelete(variable)} />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="hidden xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Measurement type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>First seen</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variables.map((variable) => (
              <TableRow key={variable.id} className="hover:bg-accent/30">
                <TableCell>
                  <p className="font-medium">{variableLabel(variable)}</p>
                  <p className="text-sm text-muted-foreground">{variable.code}</p>
                </TableCell>
                <TableCell>{getStationName(stations, variable.stationId)}</TableCell>
                <TableCell className="max-w-xs truncate">{metadata(variable.description)}</TableCell>
                <TableCell>{metadata(variable.unit)}</TableCell>
                <TableCell>{metadata(variable.measurementType)}</TableCell>
                <TableCell>
                  <OperationalBadge value={variable.active ? "ACTIVE" : "INACTIVE"} />
                </TableCell>
                <TableCell>{formatDateTime(variable.firstSeenAt)}</TableCell>
                <TableCell>{formatDateTime(variable.lastSeenAt)}</TableCell>
                <TableCell className="text-right">
                  {canEdit(variable) ? (
                    <div className="flex justify-end gap-2">
                      <ActionIconButton action="edit" label="Edit variable" onClick={() => onEdit(variable)} />
                      <ActionIconButton action="delete" label="Delete variable" onClick={() => onDelete(variable)} />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Read-only</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
