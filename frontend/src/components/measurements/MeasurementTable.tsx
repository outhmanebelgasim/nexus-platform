import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getVariableLabel } from "@/components/measurement-chart/chartUtils";
import type { Measurement } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";
import { formatDateTime } from "@/utils/format";

interface MeasurementTableProps {
  measurements: Measurement[];
  variables: MeasurementVariable[];
}

function getMeasurementValue(measurement: Measurement) {
  if (measurement.numericValue !== null) {
    return measurement.numericValue.toLocaleString();
  }
  return measurement.textValue || "Not available";
}

export function MeasurementTable({ measurements, variables }: MeasurementTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Measurement time</TableHead>
          <TableHead>Variable</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Quality</TableHead>
          <TableHead>Import batch</TableHead>
          <TableHead>Recorded</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {measurements.map((measurement) => (
          <TableRow key={`${measurement.variableId}-${measurement.measuredAt}`} className="hover:bg-accent/30">
            <TableCell className="font-medium">{formatDateTime(measurement.measuredAt)}</TableCell>
            <TableCell>{variables.find((item) => item.id === measurement.variableId) ? getVariableLabel(variables.find((item) => item.id === measurement.variableId)!) : `Variable #${measurement.variableId}`}</TableCell>
            <TableCell>{getMeasurementValue(measurement)}</TableCell>
            <TableCell>
              <OperationalBadge value={measurement.quality} />
            </TableCell>
            <TableCell className="max-w-[14rem] truncate text-muted-foreground">{measurement.importBatchId ?? "Not linked"}</TableCell>
            <TableCell>{formatDateTime(measurement.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
