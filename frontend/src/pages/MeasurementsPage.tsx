import { Activity, CalendarClock, Database, Gauge, RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MeasurementTable } from "@/components/measurements/MeasurementTable";
import { MeasurementTrend } from "@/components/measurements/MeasurementTrend";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMeasurements } from "@/hooks/useMeasurements";
import { useSensors } from "@/hooks/useSensors";
import type { MeasurementFilters } from "@/types/measurement";
import { formatDateTime } from "@/utils/format";

export function MeasurementsPage() {
  const [selectedSensorId, setSelectedSensorId] = useState<number | undefined>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const filters = useMemo<MeasurementFilters>(
    () => ({
      sensorId: selectedSensorId,
      start: startDate ? new Date(startDate).toISOString() : undefined,
      end: endDate ? new Date(endDate).toISOString() : undefined,
    }),
    [selectedSensorId, startDate, endDate],
  );
  const { sensors, isLoading: sensorsLoading, error: sensorsError } = useSensors();
  const { measurements, isLoading, error, loadMeasurements } = useMeasurements(filters);

  const latestMeasurement = [...measurements].sort((first, second) => first.time.localeCompare(second.time)).at(-1);
  const averageValue =
    measurements.length === 0
      ? "No data"
      : (measurements.reduce((total, measurement) => total + measurement.value, 0) / measurements.length).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
  const visibleMeasurements = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return measurements;
    }

    return measurements.filter((measurement) => {
      const sensor = sensors.find((item) => item.id === measurement.sensorId);
      return [sensor?.code, sensor?.sensorType, measurement.quality, measurement.importBatchId]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [measurements, searchQuery, sensors]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Telemetry Monitoring"
        title="Measurements"
        description="Review automatically collected environmental readings with time filters, sensor search and historical visualization."
        icon={Gauge}
        actions={
          <Button type="button" variant="outline" onClick={loadMeasurements} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Returned readings" value={measurements.length} description="Measurements in current view" icon={Database} />
          <MetricCard title="Latest reading" value={latestMeasurement ? formatDateTime(latestMeasurement.time) : "No data"} description="Most recent timestamp" icon={CalendarClock} />
          <MetricCard title="Average value" value={averageValue} description="Across returned measurements" icon={Activity} />
          <MetricCard title="Sensors represented" value={new Set(measurements.map((item) => item.sensorId)).size} description="Telemetry sources in view" icon={Gauge} />
        </div>
      </PageHeader>

      {error || sensorsError ? <Alert>{error ?? sensorsError}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Monitoring filters</CardTitle>
          <CardDescription>Filter the existing measurement feed without changing backend data.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            value={selectedSensorId ?? ""}
            disabled={sensorsLoading}
            onChange={(event) => setSelectedSensorId(event.target.value ? Number(event.target.value) : undefined)}
          >
            <option value="">All sensors</option>
            {sensors.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.code} - {sensor.sensorType}
              </option>
            ))}
          </Select>
          <Input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Start date" />
          <Input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="End date" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input className="pl-9" placeholder="Search readings..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <MeasurementTrend measurements={visibleMeasurements} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Latest measurements</CardTitle>
          <CardDescription>{visibleMeasurements.length} readings shown</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || sensorsLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : visibleMeasurements.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No measurements found</p>
              <p className="mt-1 text-sm text-muted-foreground">Adjust the filters or wait for the importer to collect telemetry.</p>
            </div>
          ) : (
            <MeasurementTable measurements={visibleMeasurements} sensors={sensors} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
