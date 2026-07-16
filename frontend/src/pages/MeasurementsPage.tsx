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
import { PaginationControls } from "@/components/shared/PaginationControls";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarms } from "@/hooks/useFarms";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useMeasurementAnalytics } from "@/hooks/useMeasurementAnalytics";
import { useMeasurementVariables } from "@/hooks/useMeasurementVariables";
import { useStations } from "@/hooks/useStations";
import { userService } from "@/services/userService";
import type { MeasurementAnalyticsFilters } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";
import type { UserPermissions } from "@/types/user";

const initialFilters: MeasurementAnalyticsFilters = {
  variableIds: [],
  measurementTypes: [],
  includeInactiveVariables: false,
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

function filterVariablesByScope(variables: MeasurementVariable[], stationById: Map<number, { farmId: number }>, filters: MeasurementAnalyticsFilters) {
  return variables.filter((variable) => {
    const station = stationById.get(variable.stationId);
    const matchesFarm = !filters.farmId || station?.farmId === filters.farmId;
    const matchesStation = !filters.stationId || variable.stationId === filters.stationId;
    const matchesExplicitVariable = filters.variableIds.length === 0 || filters.variableIds.includes(variable.id);
    const matchesType = filters.measurementTypes.length === 0 || Boolean(variable.measurementType && filters.measurementTypes.includes(variable.measurementType));
    const matchesActive = filters.includeInactiveVariables || variable.active;
    return matchesFarm && matchesStation && matchesExplicitVariable && matchesType && matchesActive;
  });
}

export function MeasurementsPage() {
  const [filters, setFilters] = useState<MeasurementAnalyticsFilters>(initialFilters);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const { farms, error: farmsError } = useFarms();
  const { stations, error: stationsError } = useStations();
  const { variables, isLoading: variablesLoading, error: variablesError } = useMeasurementVariables(
    filters.stationId
      ? { stationId: filters.stationId, active: filters.includeInactiveVariables ? undefined : true }
      : { active: filters.includeInactiveVariables ? undefined : true },
  );
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
  const visibleVariables = useMemo(() => {
    if (!filters.stationId) {
      return [];
    }
    if (!permissions || permissions.role === "SUPER_ADMIN") {
      return variables;
    }
    return variables.filter((variable) => allowedStationIds.has(variable.stationId));
  }, [allowedStationIds, filters.stationId, permissions, variables]);
  const scopedVariables = useMemo(
    () => filterVariablesByScope(visibleVariables, stationById, { ...filters, measurementTypes: [] }),
    [filters, stationById, visibleVariables],
  );
  const measurementTypeOptions = useMemo(() => {
    const inventoryTypes = getMeasurementTypeOptions(scopedVariables);
    if (!permissions || permissions.role === "SUPER_ADMIN") {
      return inventoryTypes;
    }
    return inventoryTypes.filter((type) => allowedMeasurementTypes.has(type));
  }, [allowedMeasurementTypes, permissions, scopedVariables]);
  const selectedVariables = useMemo(
    () => filterVariablesByScope(visibleVariables, stationById, filters),
    [filters, stationById, visibleVariables],
  );
  const filteredMeasurements = useMemo(() => {
    const selectedVariableIds = new Set(selectedVariables.map((variable) => variable.id));
    return measurements.filter((measurement) => selectedVariableIds.has(measurement.variableId));
  }, [measurements, selectedVariables]);
  const chartSeries = useMemo(
    () => buildSeries(filteredMeasurements, selectedVariables),
    [filteredMeasurements, selectedVariables],
  );
  const measurementsPagination = useClientPagination(
    filteredMeasurements,
    25,
  );

  const visibleSeriesCount = chartSeries.filter((series) => series.points.length > 0).length;
  const latestMeasurement = [...filteredMeasurements].sort((first, second) => first.measuredAt.localeCompare(second.measuredAt)).at(-1);
  const averageValue =
    filteredMeasurements.length === 0
      ? "No data"
      : (
          filteredMeasurements.reduce((total, measurement) => total + (measurement.numericValue ?? 0), 0) /
          Math.max(filteredMeasurements.filter((measurement) => measurement.numericValue !== null).length, 1)
        ).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });

  const updateFilters = (updates: Partial<MeasurementAnalyticsFilters>) => {
    setValidationError(null);
    setFilters((current) => ({ ...current, ...updates }));
  };

  const handleGenerateChart = async () => {
    setValidationError(null);

    if (!filters.stationId) {
      setValidationError("Select a station before generating a chart.");
      return;
    }

    const unauthorizedType = filters.measurementTypes.find((type) => permissions && permissions.role !== "SUPER_ADMIN" && !allowedMeasurementTypes.has(type));
    if (unauthorizedType) {
      setValidationError("You do not have permission to generate this measurement type.");
      return;
    }

    const queryVariables = filterVariablesByScope(visibleVariables, stationById, filters);
    if (queryVariables.length === 0) {
      setValidationError("No active variables match the selected station and measurement type filters.");
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

    measurementsPagination.resetPage();
    await generateChart(
      {
        ...filters,
        start: range.start,
        end: range.end,
      },
      queryVariables.map((variable) => variable.id),
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
          <MetricCard title="Selected variables" value={selectedVariables.length} description="Variables matching current filters" icon={RadioTower} />
          <MetricCard title="Visible series" value={visibleSeriesCount} description="Variables with chart data" icon={LineChart} />
          <MetricCard title="Average value" value={averageValue} description={latestMeasurement ? "Across generated readings" : "Generate a chart to analyze"} icon={Activity} />
        </div>
      </PageHeader>

      {farmsError || stationsError || variablesError || permissionsError ? <Alert>{farmsError ?? stationsError ?? variablesError ?? permissionsError}</Alert> : null}

      <ChartBuilder
        filters={filters}
        farms={scopedFarms}
        stations={scopedStations}
        variables={visibleVariables}
        measurementTypes={measurementTypeOptions}
        isLoading={isLoading || variablesLoading}
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
            variables={selectedVariables}
            series={chartSeries}
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Generated measurement records</CardTitle>
              <CardDescription>{filteredMeasurements.length.toLocaleString()} readings returned by the latest chart query</CardDescription>
            </CardHeader>
            <CardContent>
              <MeasurementTable measurements={measurementsPagination.paginatedItems} variables={selectedVariables} />
              <div className="mt-4">
                <PaginationControls
                  page={measurementsPagination.page}
                  totalPages={measurementsPagination.totalPages}
                  totalItems={measurementsPagination.totalItems}
                  pageSize={measurementsPagination.pageSize}
                  label="readings"
                  onPageChange={measurementsPagination.setPage}
                  onPageSizeChange={measurementsPagination.setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
