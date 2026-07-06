import { MapPinned, Plus, RadioTower, RefreshCcw, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StationForm } from "@/components/stations/StationForm";
import { StationTable } from "@/components/stations/StationTable";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useFarms } from "@/hooks/useFarms";
import { useStations } from "@/hooks/useStations";
import { useToast } from "@/hooks/useToast";
import type { Station, StationPayload } from "@/types/station";
import { formatDateTime } from "@/utils/format";

type FormMode = "closed" | "create" | "edit";

export function StationsPage() {
  const [selectedFarmId, setSelectedFarmId] = useState<number | undefined>();
  const { farms, isLoading: farmsLoading, error: farmsError } = useFarms();
  const { stations, isLoading, isSaving, error, loadStations, createStation, updateStation, deleteStation } =
    useStations(selectedFarmId);
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { showToast } = useToast();

  const activeStations = stations.filter((station) => station.status === "ACTIVE").length;
  const latestUpdate = useMemo(() => {
    const timestamps = stations
      .map((station) => station.updatedAt ?? station.createdAt)
      .filter((value): value is string => Boolean(value));

    if (timestamps.length === 0) {
      return "No updates";
    }

    return formatDateTime(timestamps.sort().at(-1));
  }, [stations]);

  const closeForm = () => {
    setFormMode("closed");
    setSelectedStation(null);
    setFormError(null);
  };

  const openCreateForm = () => {
    setSelectedStation(null);
    setFormError(null);
    setFormMode("create");
  };

  const openEditForm = (station: Station) => {
    setSelectedStation(station);
    setFormError(null);
    setFormMode("edit");
  };

  const handleSubmit = async (payload: StationPayload) => {
    setFormError(null);

    try {
      if (formMode === "edit" && selectedStation) {
        await updateStation(selectedStation.id, payload);
        await loadStations();
        closeForm();
        showToast({ title: "Station updated", description: `${payload.name} was updated successfully.` });
        return;
      }

      await createStation(payload);
      closeForm();
      showToast({ title: "Station created", description: `${payload.name} was added to the registry.` });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to save station.";
      setFormError(message);
      showToast({ title: "Save failed", description: message, variant: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!stationToDelete) {
      return;
    }

    try {
      await deleteStation(stationToDelete.id);
      showToast({ title: "Station deleted", description: `${stationToDelete.name} was removed.` });
      setStationToDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete station.";
      showToast({ title: "Delete failed", description: message, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Weather Station Network"
        title="Field station operations"
        description="Track weather stations, deployment status and farm coverage across the monitored agricultural network."
        icon={RadioTower}
        actions={
          <>
            <Button type="button" variant="outline" onClick={loadStations} disabled={isLoading || isSaving}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Button type="button" onClick={openCreateForm} disabled={isSaving || farms.length === 0}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New station
            </Button>
          </>
        }
      >

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricCard title="Total stations" value={stations.length} description="Stations in current view" icon={RadioTower} />
          <MetricCard title="Active stations" value={activeStations} description="Ready for measurements" icon={MapPinned} />
          <MetricCard title="Farm coverage" value={farms.length} description={`Latest update: ${latestUpdate}`} icon={Sprout} />
        </div>
      </PageHeader>

      {error || farmsError ? <Alert>{error ?? farmsError}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Station list</CardTitle>
            <CardDescription>{stations.length} stations available</CardDescription>
          </div>
          <div className="w-full lg:w-72">
            <Select
              value={selectedFarmId ?? ""}
              disabled={farmsLoading}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedFarmId(value ? Number(value) : undefined);
              }}
            >
              <option value="">All farms</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || farmsLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : stations.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No stations found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a station after registering at least one farm.</p>
              <Button className="mt-4" type="button" onClick={openCreateForm} disabled={farms.length === 0}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create station
              </Button>
            </div>
          ) : (
            <StationTable
              stations={stations}
              farms={farms}
              isSaving={isSaving}
              onEdit={openEditForm}
              onDelete={setStationToDelete}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formMode !== "closed"}
        title={formMode === "edit" ? "Edit station" : "Create station"}
        description="Station records are linked to an existing farm."
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            closeForm();
          }
        }}
      >
        <StationForm
          station={selectedStation}
          farms={farms}
          error={formError}
          isSaving={isSaving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Dialog>

      <ConfirmDialog
        open={stationToDelete !== null}
        title="Delete station"
        description={
          stationToDelete
            ? `This will permanently delete "${stationToDelete.name}". This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete station"
        isLoading={isSaving}
        onCancel={() => setStationToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
