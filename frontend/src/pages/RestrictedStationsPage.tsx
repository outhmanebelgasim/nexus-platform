import { ArrowLeft, CalendarDays, CloudSun, Layers, RadioTower, Signal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { MeasurementChart } from "@/components/measurement-chart/MeasurementChart";
import { buildConfiguredSeries } from "@/components/measurement-chart/chartUtils";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { graphService } from "@/services/graphService";
import { getApiErrorMessage } from "@/lib/api";
import { parseStationRouteId, type GraphMeasurementState } from "@/lib/restrictedStationDashboard";
import type { RestrictedGraphMeasurement, RestrictedGraphRange, StationCategory, UserGraphConfiguration } from "@/types/graph";
import type { Station } from "@/types/station";
import { formatDateTime } from "@/utils/format";

interface RestrictedStationsPageProps {
  category: StationCategory;
}

const rangeOptions: Array<{ value: RestrictedGraphRange; label: string }> = [
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "ALL_TIME", label: "All Time" },
];

function routePrefix(category: StationCategory) {
  return category === "METEO" ? "/meteo-stations" : "/fos-stations";
}

function categoryLabel(category: StationCategory) {
  return category === "METEO" ? "Meteo Stations" : "FOS Stations";
}

function stationIcon(category: StationCategory) {
  return category === "METEO" ? CloudSun : Layers;
}

function communicationLabel(station: Station) {
  return station.lastSeenAt ? formatDateTime(station.lastSeenAt) : "No importer communication recorded";
}

export function RestrictedStationsPage({ category }: RestrictedStationsPageProps) {
  const { stationId } = useParams();
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [graphs, setGraphs] = useState<UserGraphConfiguration[]>([]);
  const [range, setRange] = useState<RestrictedGraphRange>("LAST_MONTH");
  const [measurementsByGraph, setMeasurementsByGraph] = useState<Record<number, RestrictedGraphMeasurement>>({});
  const [isStationLoading, setIsStationLoading] = useState(true);
  const [isGraphsLoading, setIsGraphsLoading] = useState(false);
  const [stationError, setStationError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [measurementStateByGraph, setMeasurementStateByGraph] = useState<Record<number, GraphMeasurementState>>({});

  const selectedStationId = parseStationRouteId(stationId);
  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) ?? null,
    [selectedStationId, stations],
  );
  const Icon = stationIcon(category);
  const label = categoryLabel(category);
  const selectedStationCommunication = selectedStation ? communicationLabel(selectedStation) : "No importer communication recorded";

  useEffect(() => {
    let ignore = false;

    async function loadStations() {
      setIsStationLoading(true);
      setStationError(null);
      try {
        const loadedStations = await graphService.currentStations(category);
        if (ignore) {
          return;
        }
        setStations(loadedStations);
      } catch (loadError) {
        if (!ignore) {
          setStationError(getApiErrorMessage(loadError, { serverError: "The station list could not be loaded." }));
        }
      } finally {
        if (!ignore) {
          setIsStationLoading(false);
        }
      }
    }

    void loadStations();

    return () => {
      ignore = true;
    };
  }, [category]);

  useEffect(() => {
    let ignore = false;

    async function loadStationGraphs() {
      if (!selectedStationId) {
        setGraphs([]);
        setMeasurementsByGraph({});
        setMeasurementStateByGraph({});
        return;
      }
      setIsGraphsLoading(true);
      setGraphError(null);
      setMeasurementStateByGraph({});
      try {
        const loadedGraphs = await graphService.currentStationGraphs(selectedStationId);
        if (ignore) {
          return;
        }
        setGraphs(loadedGraphs);
        setIsGraphsLoading(false);
        if (loadedGraphs.length === 0) {
          setMeasurementsByGraph({});
          setMeasurementStateByGraph({});
          return;
        }
        setMeasurementStateByGraph(Object.fromEntries(loadedGraphs.map((graph) => [graph.id, { status: "loading" as const }])));
        const results = await Promise.allSettled(loadedGraphs.map((graph) => graphService.currentGraphMeasurements(selectedStationId, graph.id, range)));
        if (!ignore) {
          const nextMeasurements: Record<number, RestrictedGraphMeasurement> = {};
          const nextStates: Record<number, GraphMeasurementState> = {};
          results.forEach((result, index) => {
            const graph = loadedGraphs[index];
            if (result.status === "fulfilled") {
              nextMeasurements[graph.id] = result.value;
              nextStates[graph.id] = {
                status: result.value.measurements.length > 0 ? "ready" : "empty",
                message: result.value.aggregationNote ?? undefined,
              };
            } else {
              nextStates[graph.id] = {
                status: "error",
                message: getApiErrorMessage(result.reason, { serverError: "Measurements could not be loaded for this graph." }),
              };
            }
          });
          setMeasurementsByGraph(nextMeasurements);
          setMeasurementStateByGraph(nextStates);
        }
      } catch (loadError) {
        if (!ignore) {
          setGraphs([]);
          setMeasurementsByGraph({});
          setMeasurementStateByGraph({});
          setGraphError(getApiErrorMessage(loadError, { serverError: "Assigned graphs could not be loaded." }));
        }
      } finally {
        if (!ignore) {
          setIsGraphsLoading(false);
        }
      }
    }

    void loadStationGraphs();

    return () => {
      ignore = true;
    };
  }, [category, range, selectedStationId]);

  useEffect(() => {
    if (!isStationLoading && selectedStationId && !selectedStation) {
      navigate(routePrefix(category), { replace: true });
    }
  }, [category, isStationLoading, navigate, selectedStation, selectedStationId]);

  if (isStationLoading) {
    return <LoadingState />;
  }

  if (!selectedStationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assigned Stations"
          title={label}
          description="Browse the stations explicitly assigned to your account. Opening a station loads your fixed graph dashboard for that device."
          icon={Icon}
        />

        {stationError ? <Alert>{stationError}</Alert> : null}

        {stations.length === 0 ? (
          <EmptyState title={`No ${label.toLowerCase()} assigned`} description="No active station access and graph configuration is available for this category." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => (
              <Link key={station.id} to={`${routePrefix(category)}/${station.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="h-full border-border/80 bg-card shadow-sm transition-colors group-hover:border-primary/60 group-hover:bg-accent/30">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{station.code}</CardTitle>
                          <CardDescription className="truncate">{station.name}</CardDescription>
                        </div>
                      </div>
                      <OperationalBadge value={station.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Farm</p>
                      <p className="mt-1 font-medium">{station.farmName ?? `Farm #${station.farmId}`}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Last communication</p>
                      <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                        <Signal className="h-4 w-4" aria-hidden="true" />
                        {communicationLabel(station)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={label}
        title={selectedStation?.code ?? "Station dashboard"}
        description={`${selectedStation?.farmName ?? "Assigned farm"} - ${selectedStationCommunication}`}
        icon={RadioTower}
        actions={
          <Button type="button" variant="outline" onClick={() => navigate(routePrefix(category))}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        }
      >
        {selectedStation ? (
          <div className="flex flex-wrap gap-2">
            <Badge>{selectedStation.name}</Badge>
            <OperationalBadge value={selectedStation.status} />
            <Badge>{category}</Badge>
          </div>
        ) : null}
      </PageHeader>

      {stationError ? <Alert>{stationError}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Assigned graphs</p>
            <p className="text-sm text-muted-foreground">Last Month uses a rolling 30-day range. The graph layout and variables are fixed by your administrator.</p>
          </div>
          <div className="flex rounded-md border bg-background p-1">
            {rangeOptions.map((option) => (
              <Button key={option.value} type="button" variant={range === option.value ? "default" : "ghost"} size="sm" onClick={() => setRange(option.value)}>
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isGraphsLoading ? <LoadingState rows={2} /> : null}
      {graphError ? <Alert>{graphError}</Alert> : null}

      {!isGraphsLoading && !graphError && graphs.length === 0 ? (
        <EmptyState title="No active graphs have been assigned." description="This station category has no active graph configuration for your account." />
      ) : (
        <div className="space-y-5">
          {graphs.map((graph) => {
            const result = measurementsByGraph[graph.id];
            const measurementState = measurementStateByGraph[graph.id] ?? { status: "idle" };
            const variables = result?.variables ?? [];
            const measurements = result?.measurements ?? [];
            return (
              <MeasurementChart
                key={`${graph.id}-${range}-${selectedStationId}`}
                chartType="line"
                measurements={measurements}
                variables={variables}
                series={buildConfiguredSeries(measurements, graph.variables, variables)}
                title={graph.title}
                description={measurementState.message ?? `${selectedStation?.code ?? "Selected station"}${result?.aggregationNote ? ` - ${result.aggregationNote}` : ""}`}
                isLoading={measurementState.status === "loading"}
                emptyMessage={measurementState.status === "empty" ? "No measurements are available for this graph and time range." : undefined}
                errorMessage={measurementState.status === "error" ? measurementState.message : undefined}
                yAxisMin={Number(graph.yAxisMin)}
                yAxisMax={Number(graph.yAxisMax)}
                primaryAxisLabel={graph.primaryAxisLabel}
                primaryAxisUnit={graph.primaryAxisUnit}
                secondaryAxisEnabled={graph.secondaryAxisEnabled}
                secondaryAxisLabel={graph.secondaryAxisLabel}
                secondaryAxisUnit={graph.secondaryAxisUnit}
                secondaryAxisMin={graph.secondaryAxisMin}
                secondaryAxisMax={graph.secondaryAxisMax}
                rangeStart={result?.firstMeasuredAt}
                rangeEnd={result?.lastMeasuredAt}
                csvModeLabel={result?.aggregated ? `aggregated:${result.bucketInterval ?? "all-time"}` : "raw"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
