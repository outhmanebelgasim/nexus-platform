import { Bell, Filter, RefreshCcw, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AlertTable } from "@/components/alerts/AlertTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAlerts } from "@/hooks/useAlerts";
import { useMeasurementVariables } from "@/hooks/useMeasurementVariables";
import type { AlertSeverity, AlertStatus } from "@/types/alert";

export function AlertsPage() {
  const [selectedVariableId, setSelectedVariableId] = useState<number | undefined>();
  const [severity, setSeverity] = useState<AlertSeverity | "ALL">("ALL");
  const [status, setStatus] = useState<AlertStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { variables, isLoading: variablesLoading, error: variablesError } = useMeasurementVariables();
  const { alerts, isLoading, error, loadAlerts } = useAlerts(selectedVariableId);

  const visibleAlerts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesSeverity = severity === "ALL" || alert.severity === severity;
      const matchesStatus = status === "ALL" || alert.status === status;
      const variable = variables.find((item) => item.id === (alert.variableId ?? alert.sensorId));
      const matchesQuery =
        !normalizedQuery ||
        [alert.alertType, alert.message, variable?.displayName, variable?.code]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesSeverity && matchesStatus && matchesQuery;
    });
  }, [alerts, searchQuery, variables, severity, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Generated Field Alerts"
        title="Alerts"
        description="Review automatically generated operational alerts from the monitoring network. Manual alert creation is not available."
        icon={Bell}
        actions={
          <Button type="button" variant="outline" onClick={loadAlerts} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Open alerts" value={alerts.filter((alert) => alert.status === "OPEN").length} description="Require operational attention" icon={ShieldAlert} />
          <MetricCard title="Critical alerts" value={alerts.filter((alert) => alert.severity === "CRITICAL").length} description="Highest severity events" icon={Bell} />
          <MetricCard title="Displayed alerts" value={visibleAlerts.length} description="After filters and search" icon={Filter} />
        </div>
      </PageHeader>

      {error || variablesError ? <Alert>{error ?? variablesError}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>Alert feed</CardTitle>
            <CardDescription>{visibleAlerts.length} generated alerts shown</CardDescription>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:w-[760px] xl:grid-cols-[1fr_150px_150px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input className="pl-9" placeholder="Search alerts..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
            <Select value={severity} onChange={(event) => setSeverity(event.target.value as AlertSeverity | "ALL")}>
              <option value="ALL">All severities</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value as AlertStatus | "ALL")}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="IGNORED">Ignored</option>
            </Select>
            <Select
              value={selectedVariableId ?? ""}
              disabled={variablesLoading}
              onChange={(event) => setSelectedVariableId(event.target.value ? Number(event.target.value) : undefined)}
            >
              <option value="">All variables</option>
              {variables.map((variable) => (
                <option key={variable.id} value={variable.id}>
                  {variable.displayName || variable.code}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || variablesLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No alerts found</p>
              <p className="mt-1 text-sm text-muted-foreground">The backend did not return alerts for the current filters.</p>
            </div>
          ) : (
            <AlertTable alerts={visibleAlerts} variables={variables} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
