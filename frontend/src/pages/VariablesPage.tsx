import { Database, RadioTower, RefreshCcw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { MeasurementVariableTable } from "@/components/variables/MeasurementVariableTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useMeasurementVariables } from "@/hooks/useMeasurementVariables";
import { useStations } from "@/hooks/useStations";
import { getApiErrorMessage } from "@/lib/api";
import { measurementVariableService } from "@/services/measurementVariableService";
import type { MeasurementVariable, VariableActiveFilter } from "@/types/measurementVariable";
import type { MeasurementType } from "@/types/user";

const measurementTypeOptions: MeasurementType[] = [
  "AIR_TEMPERATURE",
  "SOIL_TEMPERATURE",
  "RELATIVE_HUMIDITY",
  "SOIL_MOISTURE",
  "WIND_SPEED",
  "WIND_DIRECTION",
  "SOLAR_RADIATION",
  "RAINFALL",
  "ET",
  "PRESSURE",
  "BATTERY_VOLTAGE",
  "INTERNAL_TECHNICAL_DATA",
];

function activeFilterValue(value: VariableActiveFilter) {
  if (value === "active") {
    return true;
  }
  if (value === "inactive") {
    return false;
  }
  return undefined;
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function VariablesPage() {
  const { user } = useAuth();
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<VariableActiveFilter>("all");
  const [editingVariable, setEditingVariable] = useState<MeasurementVariable | null>(null);
  const [form, setForm] = useState<{
    displayName: string;
    description: string;
    unit: string;
    measurementType: MeasurementType | "";
    active: boolean;
  }>({ displayName: "", description: "", unit: "", measurementType: "", active: true });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { stations, isLoading: stationsLoading, error: stationsError } = useStations();
  const { variables, isLoading, error, loadVariables, setVariables } = useMeasurementVariables({
    stationId: selectedStationId,
    active: activeFilterValue(activeFilter),
    search: searchQuery,
  });

  const assignedStationIds = useMemo(() => new Set(user?.stationIds ?? []), [user?.stationIds]);
  const canEditVariable = (variable: MeasurementVariable) => {
    if (user?.role === "SUPER_ADMIN") {
      return true;
    }
    if (user?.role === "ADMIN") {
      return assignedStationIds.has(variable.stationId);
    }
    return false;
  };

  const activeVariables = variables.filter((variable) => variable.active).length;
  const configuredVariables = variables.filter((variable) => variable.displayName || variable.description || variable.unit || variable.measurementType).length;
  const stationCount = new Set(variables.map((variable) => variable.stationId)).size;

  const openEditDialog = (variable: MeasurementVariable) => {
    setSaveError(null);
    setEditingVariable(variable);
    setForm({
      displayName: variable.displayName ?? "",
      description: variable.description ?? "",
      unit: variable.unit ?? "",
      measurementType: variable.measurementType ?? "",
      active: variable.active,
    });
  };

  const handleSave = async () => {
    if (!editingVariable) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await measurementVariableService.update(editingVariable.id, {
        displayName: emptyToNull(form.displayName),
        description: emptyToNull(form.description),
        unit: emptyToNull(form.unit),
        measurementType: form.measurementType || null,
        active: form.active,
      });
      setVariables((current) => current.map((variable) => (variable.id === updated.id ? updated : variable)));
      setEditingVariable(null);
    } catch (saveFailure) {
      setSaveError(getApiErrorMessage(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dynamic Telemetry Registry"
        title="Measurement variables"
        description="Review and configure dynamic measurement variables discovered from station telemetry columns."
        icon={Database}
        actions={
          <Button type="button" variant="outline" onClick={loadVariables} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Total variables" value={variables.length} description="Variables in current view" icon={Database} />
          <MetricCard title="Active variables" value={activeVariables} description="Available for current queries" icon={SlidersHorizontal} />
          <MetricCard title="Stations covered" value={stationCount} description={`${configuredVariables} configured variables`} icon={RadioTower} />
        </div>
      </PageHeader>

      {error || stationsError ? <Alert>{error ?? stationsError}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>Variable registry</CardTitle>
            <CardDescription>{variables.length} measurement variables shown</CardDescription>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_220px_160px] xl:w-[760px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input className="pl-9" placeholder="Search variables..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
            <Select
              value={selectedStationId ?? ""}
              disabled={stationsLoading}
              onChange={(event) => setSelectedStationId(event.target.value ? Number(event.target.value) : undefined)}
            >
              <option value="">All stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </Select>
            <Select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as VariableActiveFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
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
          ) : variables.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No variables found</p>
              <p className="mt-1 text-sm text-muted-foreground">The API did not return measurement variables for the current filters.</p>
            </div>
          ) : (
            <MeasurementVariableTable variables={variables} stations={stations} canEdit={canEditVariable} onEdit={openEditDialog} />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingVariable)}
        title="Edit variable metadata"
        description={editingVariable ? `${editingVariable.code} at station ${editingVariable.stationId}` : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVariable(null);
          }
        }}
      >
        <div className="space-y-4">
          {saveError ? <Alert>{saveError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Variable code</Label>
              <Input value={editingVariable?.code ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Station</Label>
              <Input value={editingVariable?.stationId ?? ""} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="measurementType">Measurement type</Label>
              <Select
                id="measurementType"
                value={form.measurementType}
                onChange={(event) => setForm((current) => ({ ...current, measurementType: event.target.value as MeasurementType | "" }))}
              >
                <option value="">Not configured</option>
                {measurementTypeOptions.map((measurementType) => (
                  <option key={measurementType} value={measurementType}>
                    {measurementType.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Active
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditingVariable(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !editingVariable || !canEditVariable(editingVariable)}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
