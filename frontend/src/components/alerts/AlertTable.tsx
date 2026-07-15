import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AlertEvent } from "@/types/alert";
import type { MeasurementVariable } from "@/types/measurementVariable";
import { formatDateTime } from "@/utils/format";

interface AlertTableProps {
  alerts: AlertEvent[];
  variables: MeasurementVariable[];
}

function getVariableCode(variables: MeasurementVariable[], variableId: number) {
  const variable = variables.find((item) => item.id === variableId);
  return variable?.displayName || variable?.code || `Variable #${variableId}`;
}

export function AlertTable({ alerts, variables }: AlertTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Alert</TableHead>
          <TableHead>Variable</TableHead>
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
            <TableCell>{getVariableCode(variables, alert.variableId ?? alert.sensorId)}</TableCell>
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
