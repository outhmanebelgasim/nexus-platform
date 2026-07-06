import { Activity, Bell, Cpu, RadioTower, Sprout, Waves } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlerts } from "@/hooks/useAlerts";
import { useFarms } from "@/hooks/useFarms";
import { useImportLogs } from "@/hooks/useImportLogs";
import { useMeasurements } from "@/hooks/useMeasurements";
import { useSensors } from "@/hooks/useSensors";
import { useStations } from "@/hooks/useStations";
import { formatDateTime } from "@/utils/format";

export function DashboardPage() {
  const { farms } = useFarms();
  const { stations } = useStations();
  const { sensors } = useSensors();
  const { alerts } = useAlerts();
  const { measurements } = useMeasurements();
  const { importLogs } = useImportLogs();

  const activeStations = stations.filter((station) => station.status === "ACTIVE").length;
  const activeSensors = sensors.filter((sensor) => sensor.status === "ACTIVE").length;
  const healthySensors = sensors.length === 0 ? 0 : Math.round((activeSensors / sensors.length) * 100);
  const openAlerts = alerts.filter((alert) => alert.status === "OPEN").length;
  const latestMeasurementTime = measurements
    .map((measurement) => measurement.time)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const latestImportRun = importLogs
    .map((log) => log.startedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="NEXUS Smart Agriculture Platform"
        title="Agricultural Monitoring & Decision Support System"
        description="Monitor farms, weather stations, environmental sensors and agricultural telemetry in real time."
        icon={Activity}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Total farms" value={farms.length} description="Registered agricultural sites" icon={Sprout} />
        <MetricCard title="Total weather stations" value={stations.length} description="Installed field stations" icon={RadioTower} />
        <MetricCard title="Active sensors" value={activeSensors} description="Sensors currently available" icon={Cpu} />
        <MetricCard title="Open alerts" value={openAlerts} description="Generated alerts requiring attention" icon={Bell} />
        <MetricCard
          title="Latest measurement"
          value={latestMeasurementTime ? formatDateTime(latestMeasurementTime) : "Pending"}
          description="Most recent telemetry reading"
          icon={Waves}
        />
        <MetricCard title="Sensor health" value={`${healthySensors}%`} description="Share of active registered sensors" icon={Activity} />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Platform overview</CardTitle>
          <CardDescription>Operational readiness across farms, stations and sensors.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-medium">Online stations</p>
              <p className="mt-2 text-3xl font-semibold">{activeStations}</p>
              <p className="mt-1 text-sm text-muted-foreground">Stations marked active and ready for field data.</p>
            </div>
            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-medium">Sensor coverage</p>
              <p className="mt-2 text-3xl font-semibold">{sensors.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Environmental sensors registered across stations.</p>
            </div>
            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-medium">Latest importer run</p>
              <p className="mt-2 text-3xl font-semibold">{latestImportRun ? formatDateTime(latestImportRun) : "Pending"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Most recent .dat ingestion execution returned by the API.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
