import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AlertEvent } from "@/types/alert";
import type { Sensor } from "@/types/sensor";
import { formatDateTime } from "@/utils/format";

interface AlertTableProps {
  alerts: AlertEvent[];
  sensors: Sensor[];
}

function getSensorCode(sensors: Sensor[], sensorId: number) {
  return sensors.find((sensor) => sensor.id === sensorId)?.code ?? `Sensor #${sensorId}`;
}

export function AlertTable({ alerts, sensors }: AlertTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Alert</TableHead>
          <TableHead>Sensor</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Triggered</TableHead>
          <TableHead>Resolved</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id} className="hover:bg-accent/30">
            <TableCell>
              <p className="font-medium">{alert.alertType}</p>
              <p className="max-w-xl text-sm text-muted-foreground">{alert.message}</p>
            </TableCell>
            <TableCell>{getSensorCode(sensors, alert.sensorId)}</TableCell>
            <TableCell>
              <OperationalBadge value={alert.severity} />
            </TableCell>
            <TableCell>
              <OperationalBadge value={alert.status} />
            </TableCell>
            <TableCell>{formatDateTime(alert.triggeredAt)}</TableCell>
            <TableCell>{formatDateTime(alert.resolvedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
