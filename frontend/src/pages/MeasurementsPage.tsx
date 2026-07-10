import { Activity, AlertTriangle, Database, Gauge, LineChart, RadioTower } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChartBuilder } from "@/components/measurement-chart/ChartBuilder";
import { EmptyChartState } from "@/components/measurement-chart/EmptyChartState";
import { LoadingChart } from "@/components/measurement-chart/LoadingChart";
import { MeasurementChart } from "@/components/measurement-chart/MeasurementChart";
import { buildSeries, getMeasurementTypeOptions, resolveTimeRange } from "@/components/measurement-chart/chartUtils";
import { MeasurementTable } from "@/components/measurements/MeasurementTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarms } from "@/hooks/useFarms";
import { useMeasurementAnalytics } from "@/hooks/useMeasurementAnalytics";
import { useSensors } from "@/hooks/useSensors";
import { useStations } from "@/hooks/useStations";
import { userService } from "@/services/userService";
import type { MeasurementAnalyticsFilters } from "@/types/measurement";
import type { Sensor } from "@/types/sensor";
import type { UserPermissions } from "@/types/user";

const initialFilters: MeasurementAnalyticsFilters = {
  sensorIds: [],
  measurementTypes: [],
  timeRange: "24h",
  chartType: "line",
};

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function filterSensorsByScope(sensors: Sensor[], stationById: Map<number, { farmId: number }>, filters: MeasurementAnalyticsFilters) {
  return sensors.filter((sensor) => {
    const station = stationById.get(sensor.stationId);
    const matchesFarm = !filters.farmId || station?.farmId === filters.farmId;
    const matchesStation = !filters.stationId || sensor.stationId === filters.stationId;
    const matchesExplicitSensor = filters.sensorIds.length === 0 || filters.sensorIds.includes(sensor.id);
    const matchesType = filters.measurementTypes.length === 0 || filters.measurementTypes.includes(sensor.sensorType);
    return matchesFarm && matchesStation && matchesExplicitSensor && matchesType;
  });
}

export function MeasurementsPage() {
  const [filters, setFilters] = useState<MeasurementAnalyticsFilters>(initialFilters);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const { farms, error: farmsError } = useFarms();
  const { stations, error: stationsError } = useStations();
  const { sensors, error: sensorsError } = useSensors();
  const { measurements, isLoading, error, hasGenerated, generateChart } = useMeasurementAnalytics();

  useEffect(() => {
    let ignore = false;

    async function loadPermissions() {
      try {
        const data = await userService.currentPermissions();
        if (!ignore) {
          setPermissions(data);
        }
      } catch {
        if (!ignore) {
          setPermissionsError("Unable to load your measurement permissions.");
        }
      }
    }

    void loadPermissions();

    return () => {
      ignore = true;
    };
  }, []);

  const stationById = useMemo(() => new Map(stations.map((station) => [station.id, station])), [stations]);
  const allowedFarmIds = useMemo(() => new Set(permissions?.farmIds ?? []), [permissions]);
  const allowedStationIds = useMemo(() => new Set(permissions?.stationIds ?? []), [permissions]);
  const allowedMeasurementTypes = useMemo<Set<string>>(() => new Set(permissions?.allowedMeasurementTypes ?? []), [permissions]);
  const scopedFarms = useMemo(
    () => (!permissions || permissions.role === "SUPER_ADMIN" ? farms : farms.filter((farm) => allowedFarmIds.has(farm.id))),
    [allowedFarmIds, farms, permissions],
  );
  const scopedStations = useMemo(
    () => (!permissions || permissions.role === "SUPER_ADMIN" ? stations : stations.filter((station) => allowedStationIds.has(station.id))),
    [allowedStationIds, permissions, stations],
  );
  const visibleSensors = useMemo(
    () => (!permissions || permissions.role === "SUPER_ADMIN" ? sensors : sensors.filter((sensor) => allowedStationIds.has(sensor.stationId))),
    [allowedStationIds, permissions, sensors],
  );
  const scopedSensors = useMemo(
    () => filterSensorsByScope(visibleSensors, stationById, { ...filters, measurementTypes: [] }),
    [filters, stationById, visibleSensors],
  );
  const measurementTypeOptions = useMemo(() => {
    const inventoryTypes = getMeasurementTypeOptions(scopedSensors);
    if (!permissions || permissions.role === "SUPER_ADMIN") {
      return inventoryTypes;
    }
    return inventoryTypes.filter((type) => allowedMeasurementTypes.has(type));
  }, [allowedMeasurementTypes, permissions, scopedSensors]);
  const selectedSensors = useMemo(
    () => filterSensorsByScope(visibleSensors, stationById, filters),
    [filters, stationById, visibleSensors],
  );
  const filteredMeasurements = useMemo(() => {
    const selectedSensorIds = new Set(selectedSensors.map((sensor) => sensor.id));
    return measurements.filter((measurement) => selectedSensorIds.has(measurement.sensorId));
  }, [measurements, selectedSensors]);
  const chartSeries = useMemo(
    () => buildSeries(filteredMeasurements, selectedSensors, filters.measurementTypes),
    [filteredMeasurements, filters.measurementTypes, selectedSensors],
  );

  const visibleSeriesCount = chartSeries.filter((series) => series.points.length > 0).length;
  const latestMeasurement = [...filteredMeasurements].sort((first, second) => first.time.localeCompare(second.time)).at(-1);
  const averageValue =
    filteredMeasurements.length === 0
      ? "No data"
      : (filteredMeasurements.reduce((total, measurement) => total + measurement.value, 0) / filteredMeasurements.length).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });

  const updateFilters = (updates: Partial<MeasurementAnalyticsFilters>) => {
    setValidationError(null);
    setFilters((current) => ({ ...current, ...updates }));
  };

  const handleGenerateChart = async () => {
    setValidationError(null);

    if (filters.measurementTypes.length === 0) {
      setValidationError("Select at least one measurement type before generating a chart.");
      return;
    }

    const unauthorizedType = filters.measurementTypes.find((type) => permissions && permissions.role !== "SUPER_ADMIN" && !allowedMeasurementTypes.has(type));
    if (unauthorizedType) {
      setValidationError("You do not have permission to generate this measurement type.");
      return;
    }

    const querySensors = filterSensorsByScope(visibleSensors, stationById, filters);
    if (querySensors.length === 0) {
      setValidationError("No sensors match the selected farm, station and measurement type combination.");
      return;
    }

    const range = resolveTimeRange({
      ...filters,
      start: toIsoDateTime(filters.start),
      end: toIsoDateTime(filters.end),
    });
    if (filters.timeRange === "custom" && (!range.start || !range.end)) {
      setValidationError("Select a valid custom start and end date before generating a chart.");
      return;
    }

    if (range.start && range.end && new Date(range.start).getTime() >= new Date(range.end).getTime()) {
      setValidationError("The start date must be earlier than the end date.");
      return;
    }

    await generateChart(
      {
        ...filters,
        start: range.start,
        end: range.end,
      },
      querySensors.map((sensor) => sensor.id),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Custom Measurements Analytics"
        title="Telemetry analytics workspace"
        description="Build on-demand visualizations from historical measurements by selecting scope, series, time range and chart type."
        icon={Gauge}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Generated readings" value={filteredMeasurements.length} description="Returned by the latest query" icon={Database} />
          <MetricCard title="Selected sensors" value={selectedSensors.length} description="Sensors matching current filters" icon={RadioTower} />
          <MetricCard title="Visible series" value={visibleSeriesCount} description="Measurement types with chart data" icon={LineChart} />
          <MetricCard title="Average value" value={averageValue} description={latestMeasurement ? "Across generated readings" : "Generate a chart to analyze"} icon={Activity} />
        </div>
      </PageHeader>

      {farmsError || stationsError || sensorsError || permissionsError ? <Alert>{farmsError ?? stationsError ?? sensorsError ?? permissionsError}</Alert> : null}

      <ChartBuilder
        filters={filters}
        farms={scopedFarms}
        stations={scopedStations}
        sensors={visibleSensors}
        measurementTypes={measurementTypeOptions}
        isLoading={isLoading}
        error={validationError}
        onChange={updateFilters}
        onGenerate={handleGenerateChart}
      />

      {isLoading ? (
        <LoadingChart />
      ) : !hasGenerated ? (
        <EmptyChartState />
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Unable to generate chart
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : filteredMeasurements.length === 0 || visibleSeriesCount === 0 ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>No data found</CardTitle>
            <CardDescription>
              The API returned no measurements for the selected filters. Adjust the scope, time range or measurement types and generate again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <MeasurementChart
            chartType={filters.chartType}
            measurements={filteredMeasurements}
            sensors={selectedSensors}
            series={chartSeries}
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Generated measurement records</CardTitle>
              <CardDescription>{filteredMeasurements.length.toLocaleString()} readings returned by the latest chart query</CardDescription>
            </CardHeader>
            <CardContent>
              <MeasurementTable measurements={filteredMeasurements} sensors={selectedSensors} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
