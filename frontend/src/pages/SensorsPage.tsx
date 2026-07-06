import { Cpu, RadioTower, RefreshCcw, Search, Thermometer } from "lucide-react";
import { useMemo, useState } from "react";
import { SensorTable } from "@/components/sensors/SensorTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useSensors } from "@/hooks/useSensors";
import { useStations } from "@/hooks/useStations";
import { formatDateTime } from "@/utils/format";
import { getStationName } from "@/utils/labels";

export function SensorsPage() {
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const { stations, isLoading: stationsLoading, error: stationsError } = useStations();
  const { sensors, isLoading, error, loadSensors } = useSensors(selectedStationId);

  const activeSensors = sensors.filter((sensor) => sensor.status === "ACTIVE").length;
  const sensorTypes = new Set(sensors.map((sensor) => sensor.sensorType)).size;
  const latestCommunication = useMemo(() => {
    const timestamps = sensors
      .map((sensor) => sensor.updatedAt ?? sensor.createdAt)
      .filter((value): value is string => Boolean(value));

    if (timestamps.length === 0) {
      return "No communication";
    }

    return formatDateTime(timestamps.sort().at(-1));
  }, [sensors]);
  const visibleSensors = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return sensors;
    }

    return sensors.filter((sensor) =>
      [sensor.code, sensor.name, sensor.sensorType, sensor.status, sensor.metadata, getStationName(stations, sensor.stationId)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [searchQuery, sensors, stations]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Synchronized Sensor Network"
        title="Sensor inventory and health"
        description="Review field sensors synchronized from the monitoring infrastructure. Sensor records are read-only in the frontend."
        icon={Cpu}
        actions={
          <Button type="button" variant="outline" onClick={loadSensors} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Total sensors" value={sensors.length} description="Sensors in current view" icon={Cpu} />
          <MetricCard title="Active sensors" value={activeSensors} description="Currently communicating or available" icon={Thermometer} />
          <MetricCard title="Sensor types" value={sensorTypes} description={`Last communication: ${latestCommunication}`} icon={RadioTower} />
        </div>
      </PageHeader>

      {error || stationsError ? <Alert>{error ?? stationsError}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Sensor registry</CardTitle>
            <CardDescription>{visibleSensors.length} synchronized sensors shown</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_220px] lg:w-[560px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input className="pl-9" placeholder="Search sensors..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
            <Select
              value={selectedStationId ?? ""}
              disabled={stationsLoading}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedStationId(value ? Number(value) : undefined);
              }}
            >
              <option value="">All stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || stationsLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : visibleSensors.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No sensors found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The backend did not return synchronized sensors for the current filters.
              </p>
            </div>
          ) : (
            <SensorTable sensors={visibleSensors} stations={stations} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
