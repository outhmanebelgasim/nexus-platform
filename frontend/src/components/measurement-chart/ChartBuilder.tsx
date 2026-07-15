import { BarChart3, LineChart, Play, SlidersHorizontal, Waves } from "lucide-react";
import { MeasurementSelector } from "@/components/measurement-chart/MeasurementSelector";
import { TimeRangeSelector } from "@/components/measurement-chart/TimeRangeSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Farm } from "@/types/farm";
import type { ChartType, MeasurementAnalyticsFilters } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";
import type { Station } from "@/types/station";

interface ChartBuilderProps {
  filters: MeasurementAnalyticsFilters;
  farms: Farm[];
  stations: Station[];
  variables: MeasurementVariable[];
  measurementTypes: string[];
  isLoading: boolean;
  error?: string | null;
  onChange: (updates: Partial<MeasurementAnalyticsFilters>) => void;
  onGenerate: () => void;
}

const chartTypes: Array<{ value: ChartType; label: string; icon: typeof LineChart }> = [
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "area", label: "Area Chart", icon: Waves },
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
];

export function ChartBuilder({
  filters,
  farms,
  stations,
  variables,
  measurementTypes,
  isLoading,
  error,
  onChange,
  onGenerate,
}: ChartBuilderProps) {
  const filteredStations = filters.farmId
    ? stations.filter((station) => station.farmId === filters.farmId)
    : stations;
  const filteredVariables = variables.filter((variable) => variable.stationId === filters.stationId && variable.active);

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" />
            Chart builder
          </CardTitle>
          <CardDescription>
            Select the field scope, telemetry series, time window and visualization type before generating data.
          </CardDescription>
        </div>
        <Button type="button" onClick={onGenerate} disabled={isLoading}>
          <Play className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Generating..." : "Generate Chart"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="farmId">Farm</Label>
            <Select
              id="farmId"
              value={filters.farmId ?? ""}
              onChange={(event) =>
                onChange({
                  farmId: event.target.value ? Number(event.target.value) : undefined,
                  stationId: undefined,
                  variableIds: [],
                })
              }
            >
              <option value="">All farms</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stationId">Station</Label>
            <Select
              id="stationId"
              value={filters.stationId ?? ""}
              onChange={(event) =>
                onChange({
                  stationId: event.target.value ? Number(event.target.value) : undefined,
                  variableIds: [],
                })
              }
            >
              <option value="">Select station</option>
              {filteredStations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variableIds">Variables</Label>
            <Select
              id="variableIds"
              value=""
              disabled={!filters.stationId}
              onChange={(event) => {
                const variableId = Number(event.target.value);
                if (!variableId || filters.variableIds.includes(variableId)) {
                  return;
                }
                onChange({ variableIds: [...filters.variableIds, variableId] });
              }}
            >
              <option value="">{filters.stationId ? "Add variable to query" : "Select a station first"}</option>
              {filteredVariables.map((variable) => (
                <option key={variable.id} value={variable.id}>
                  {variable.displayName || variable.code}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              {filters.variableIds.length === 0 ? (
                <span className="text-xs text-muted-foreground">All active variables for the selected station will be queried.</span>
              ) : (
                filters.variableIds.map((variableId) => {
                  const variable = variables.find((item) => item.id === variableId);
                  return (
                    <button
                      key={variableId}
                      type="button"
                      className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                      onClick={() => onChange({ variableIds: filters.variableIds.filter((item) => item !== variableId) })}
                    >
                      {variable?.displayName || variable?.code || `Variable #${variableId}`} x
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Measurement types</Label>
          <MeasurementSelector
            measurementTypes={measurementTypes}
            selectedTypes={filters.measurementTypes}
            onChange={(measurementTypesValue) => onChange({ measurementTypes: measurementTypesValue })}
          />
        </div>

        <div className="space-y-2">
          <Label>Time range</Label>
          <TimeRangeSelector filters={filters} onChange={onChange} />
        </div>

        <div className="space-y-2">
          <Label>Visualization</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {chartTypes.map((chartType) => {
              const Icon = chartType.icon;
              return (
                <Button
                  key={chartType.value}
                  type="button"
                  variant={filters.chartType === chartType.value ? "default" : "outline"}
                  onClick={() => onChange({ chartType: chartType.value })}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {chartType.label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
