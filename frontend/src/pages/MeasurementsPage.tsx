import { Activity, AlertTriangle, Database, Gauge, LineChart, RadioTower } from "lucide-react";
import { useMemo, useState } from "react";
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
import type { MeasurementAnalyticsFilters } from "@/types/measurement";
import type { Sensor } from "@/types/sensor";

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
  const { farms, error: farmsError } = useFarms();
  const { stations, error: stationsError } = useStations();
  const { sensors, error: sensorsError } = useSensors();
  const { measurements, isLoading, error, hasGenerated, generateChart } = useMeasurementAnalytics();

  const stationById = useMemo(() => new Map(stations.map((station) => [station.id, station])), [stations]);
  const scopedSensors = useMemo(
    () => filterSensorsByScope(sensors, stationById, { ...filters, measurementTypes: [] }),
    [filters, sensors, stationById],
  );
  const measurementTypeOptions = useMemo(() => getMeasurementTypeOptions(scopedSensors), [scopedSensors]);
  const selectedSensors = useMemo(
    () => filterSensorsByScope(sensors, stationById, filters),
    [filters, sensors, stationById],
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

    const querySensors = filterSensorsByScope(sensors, stationById, filters);
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

      {farmsError || stationsError || sensorsError ? <Alert>{farmsError ?? stationsError ?? sensorsError}</Alert> : null}

      <ChartBuilder
        filters={filters}
        farms={farms}
        stations={stations}
        sensors={sensors}
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
