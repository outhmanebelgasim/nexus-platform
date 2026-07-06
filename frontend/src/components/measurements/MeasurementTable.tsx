import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Measurement } from "@/types/measurement";
import type { Sensor } from "@/types/sensor";
import { formatDateTime } from "@/utils/format";

interface MeasurementTableProps {
  measurements: Measurement[];
  sensors: Sensor[];
}

function getSensorLabel(sensors: Sensor[], sensorId: number) {
  const sensor = sensors.find((item) => item.id === sensorId);
  return sensor ? `${sensor.code} - ${sensor.sensorType}` : `Sensor #${sensorId}`;
}

export function MeasurementTable({ measurements, sensors }: MeasurementTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Measurement time</TableHead>
          <TableHead>Sensor</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Quality</TableHead>
          <TableHead>Import batch</TableHead>
          <TableHead>Recorded</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {measurements.map((measurement) => (
          <TableRow key={`${measurement.sensorId}-${measurement.time}`} className="hover:bg-accent/30">
            <TableCell className="font-medium">{formatDateTime(measurement.time)}</TableCell>
            <TableCell>{getSensorLabel(sensors, measurement.sensorId)}</TableCell>
            <TableCell>{measurement.value.toLocaleString()}</TableCell>
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
