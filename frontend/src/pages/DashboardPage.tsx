import { Activity, Bell, ClipboardList, Cpu, RadioTower, Sprout, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useFarms } from "@/hooks/useFarms";
import { useImportLogs } from "@/hooks/useImportLogs";
import { useMeasurements } from "@/hooks/useMeasurements";
import { useMeasurementVariables } from "@/hooks/useMeasurementVariables";
import { useStations } from "@/hooks/useStations";
import { getApiErrorMessage } from "@/lib/api";
import { alertService } from "@/services/alertService";
import { measurementService } from "@/services/measurementService";
import type { AlertEvent } from "@/types/alert";
import type { Measurement } from "@/types/measurement";
import { formatDateTime } from "@/utils/format";

export function DashboardPage() {
  const { user } = useAuth();
  const canViewFarmTotals = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canViewImporterStatus = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "TECHNICIAN";
  const shouldApplyAssignments = user?.role === "TECHNICIAN" || user?.role === "VIEWER";

  const { farms } = useFarms(canViewFarmTotals);
  const { stations } = useStations();
  const { variables } = useMeasurementVariables();
  const { alerts } = useAlerts(undefined, !shouldApplyAssignments);
  const { measurements } = useMeasurements({}, !shouldApplyAssignments);
  const { importLogs } = useImportLogs(canViewImporterStatus);
  const [assignedAlerts, setAssignedAlerts] = useState<AlertEvent[]>([]);
  const [assignedMeasurements, setAssignedMeasurements] = useState<Measurement[]>([]);
  const [assignedTelemetryError, setAssignedTelemetryError] = useState<string | null>(null);

  const assignedStationIds = useMemo(() => new Set(user?.stationIds ?? []), [user?.stationIds]);
  const scopedStations = useMemo(
    () => (shouldApplyAssignments ? stations.filter((station) => assignedStationIds.has(station.id)) : stations),
    [assignedStationIds, shouldApplyAssignments, stations],
  );
  const scopedStationIds = useMemo(() => new Set(scopedStations.map((station) => station.id)), [scopedStations]);
  const scopedVariables = useMemo(
    () => (shouldApplyAssignments ? variables.filter((variable) => scopedStationIds.has(variable.stationId)) : variables),
    [scopedStationIds, shouldApplyAssignments, variables],
  );
  const scopedVariableIds = useMemo(() => scopedVariables.map((variable) => variable.id), [scopedVariables]);

  useEffect(() => {
    let ignore = false;

    async function loadAssignedTelemetry() {
      if (!shouldApplyAssignments) {
        setAssignedAlerts([]);
        setAssignedMeasurements([]);
        setAssignedTelemetryError(null);
        return;
      }

      if (scopedVariableIds.length === 0) {
        setAssignedAlerts([]);
        setAssignedMeasurements([]);
          setAssignedTelemetryError(null);
        return;
      }

      try {
        setAssignedTelemetryError(null);
        const [nextMeasurements, alertResponses] = await Promise.all([
          measurementService.findAnalytics({ variableIds: scopedVariableIds }),
          Promise.all(scopedVariableIds.map((variableId) => alertService.findAll(variableId))),
        ]);

        if (!ignore) {
          setAssignedMeasurements(nextMeasurements);
          setAssignedAlerts(alertResponses.flat());
        }
      } catch (error) {
        if (!ignore) {
          setAssignedMeasurements([]);
          setAssignedAlerts([]);
          setAssignedTelemetryError(getApiErrorMessage(error));
        }
      }
    }

    void loadAssignedTelemetry();

    return () => {
      ignore = true;
    };
  }, [scopedVariableIds, shouldApplyAssignments]);

  const scopedAlerts = shouldApplyAssignments ? assignedAlerts : alerts;
  const scopedMeasurements = shouldApplyAssignments ? assignedMeasurements : measurements;

  const activeStations = scopedStations.filter((station) => station.status === "ACTIVE").length;
  const activeVariables = scopedVariables.filter((variable) => variable.active).length;
  const configuredVariables = scopedVariables.filter((variable) => variable.measurementType).length;
  const variableConfiguration = scopedVariables.length === 0 ? 0 : Math.round((configuredVariables / scopedVariables.length) * 100);
  const openAlerts = scopedAlerts.filter((alert) => alert.status === "OPEN").length;
  const latestMeasurementTime = scopedMeasurements
    .map((measurement) => measurement.measuredAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const latestImportRun = importLogs
    .map((log) => log.startedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const hasAuthorizedMonitoringData = scopedStations.length > 0 || scopedVariables.length > 0 || scopedMeasurements.length > 0 || scopedAlerts.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="NEXUS Smart Agriculture Platform"
        title="Agricultural Monitoring & Decision Support System"
        description="Monitor farms, weather stations, measurement variables and agricultural telemetry in real time."
        icon={Activity}
      />

      {assignedTelemetryError ? <Alert>{assignedTelemetryError}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {canViewFarmTotals ? <MetricCard title="Total farms" value={farms.length} description="Registered agricultural sites" icon={Sprout} /> : null}
        <MetricCard title="Total weather stations" value={scopedStations.length} description="Authorized field stations" icon={RadioTower} />
        <MetricCard title="Active variables" value={activeVariables} description="Variables currently available" icon={Cpu} />
        <MetricCard title="Open alerts" value={openAlerts} description="Generated alerts requiring attention" icon={Bell} />
        <MetricCard
          title="Latest measurement"
          value={latestMeasurementTime ? formatDateTime(latestMeasurementTime) : "No readings"}
          description="Most recent telemetry reading"
          icon={Waves}
        />
        <MetricCard title="Variable mapping" value={`${variableConfiguration}%`} description="Share of authorized variables with semantic types" icon={Activity} />
        {canViewImporterStatus ? (
          <MetricCard
            title="Latest importer run"
            value={latestImportRun ? formatDateTime(latestImportRun) : "No runs"}
            description="Most recent .dat ingestion execution returned by the API"
            icon={ClipboardList}
          />
        ) : null}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{canViewFarmTotals ? "Platform overview" : "Monitoring overview"}</CardTitle>
          <CardDescription>Operational readiness across authorized stations and variables.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasAuthorizedMonitoringData ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium">Online stations</p>
                <p className="mt-2 text-3xl font-semibold">{activeStations}</p>
                <p className="mt-1 text-sm text-muted-foreground">Authorized stations marked active and ready for field data.</p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium">Variable coverage</p>
                <p className="mt-2 text-3xl font-semibold">{scopedVariables.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Measurement variables available in the authorized station scope.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-background p-6">
              <p className="text-sm font-medium">No authorized monitoring data</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account does not currently have assigned stations, variables, measurements or alerts to display.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
