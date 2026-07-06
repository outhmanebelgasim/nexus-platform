import { CloudRain, Droplets, Gauge, Thermometer, Waves } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Sensor } from "@/types/sensor";
import type { Station } from "@/types/station";
import { formatDateTime } from "@/utils/format";
import { getStationName } from "@/utils/labels";

interface SensorTableProps {
  sensors: Sensor[];
  stations: Station[];
}

function SensorTypeIcon({ sensorType }: { sensorType: string }) {
  const normalizedType = sensorType.toLowerCase();

  if (normalizedType.includes("temp")) {
    return <Thermometer className="h-4 w-4 text-primary" aria-hidden="true" />;
  }

  if (normalizedType.includes("rain") || normalizedType.includes("precip")) {
    return <CloudRain className="h-4 w-4 text-primary" aria-hidden="true" />;
  }

  if (normalizedType.includes("humid") || normalizedType.includes("moist")) {
    return <Droplets className="h-4 w-4 text-primary" aria-hidden="true" />;
  }

  if (normalizedType.includes("wind")) {
    return <Waves className="h-4 w-4 text-primary" aria-hidden="true" />;
  }

  return <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />;
}

export function SensorTable({ sensors, stations }: SensorTableProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {sensors.map((sensor) => (
          <article key={sensor.id} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/20">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{sensor.code}</h3>
                  <p className="text-sm text-muted-foreground">{sensor.name || "Synchronized sensor"}</p>
                </div>
                <StatusBadge status={sensor.status} />
              </div>
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Station: </span>
                  {getStationName(stations, sensor.stationId)}
                </p>
                <p className="inline-flex items-center gap-2">
                  <SensorTypeIcon sensorType={sensor.sensorType} />
                  <span className="text-muted-foreground">Type: </span>
                  {sensor.sensorType}
                </p>
                <p>
                  <span className="text-muted-foreground">Installation date: </span>
                  {formatDateTime(sensor.createdAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Last communication: </span>
                  {formatDateTime(sensor.updatedAt)}
                </p>
                {sensor.metadata ? <p className="text-muted-foreground">{sensor.metadata}</p> : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sensor code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Installation date</TableHead>
              <TableHead>Last communication</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sensors.map((sensor) => (
              <TableRow key={sensor.id} className="hover:bg-accent/30">
                <TableCell>
                  <p className="font-medium">{sensor.code}</p>
                  <p className="text-sm text-muted-foreground">{sensor.name || "Synchronized sensor"}</p>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <SensorTypeIcon sensorType={sensor.sensorType} />
                    {sensor.sensorType}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={sensor.status} />
                </TableCell>
                <TableCell>{getStationName(stations, sensor.stationId)}</TableCell>
                <TableCell>{formatDateTime(sensor.createdAt)}</TableCell>
                <TableCell>{formatDateTime(sensor.updatedAt)}</TableCell>
                <TableCell className="max-w-xs truncate">{sensor.metadata || sensor.unit || "Not available"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
