import { CalendarClock, Cpu, Plus, RadioTower, RefreshCcw, Search, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import { FarmForm } from "@/components/farms/FarmForm";
import { FarmTable } from "@/components/farms/FarmTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFarms } from "@/hooks/useFarms";
import { useSensors } from "@/hooks/useSensors";
import { useStations } from "@/hooks/useStations";
import { useToast } from "@/hooks/useToast";
import type { Farm, FarmPayload } from "@/types/farm";

type FormMode = "closed" | "create" | "edit";
type FarmSort = "name-asc" | "name-desc" | "newest" | "oldest";

export function FarmsPage() {
  const { farms, isLoading, isSaving, error, loadFarms, createFarm, updateFarm, deleteFarm } = useFarms();
  const { stations } = useStations();
  const { sensors } = useSensors();
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<FarmSort>("newest");
  const { showToast } = useToast();
  const activeStations = stations.filter((station) => station.status === "ACTIVE").length;
  const latestUpdate = useMemo(() => {
    const timestamps = farms
      .map((farm) => farm.updatedAt ?? farm.createdAt)
      .filter((value): value is string => Boolean(value));

    if (timestamps.length === 0) {
      return "No updates";
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(timestamps.sort().at(-1)!),
    );
  }, [farms]);

  const visibleFarms = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredFarms = farms.filter((farm) => {
      if (!normalizedQuery) {
        return true;
      }

      return [farm.name, farm.location, farm.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });

    return [...filteredFarms].sort((first, second) => {
      if (sortOrder === "name-asc") {
        return first.name.localeCompare(second.name);
      }

      if (sortOrder === "name-desc") {
        return second.name.localeCompare(first.name);
      }

      const firstTime = new Date(first.createdAt ?? 0).getTime();
      const secondTime = new Date(second.createdAt ?? 0).getTime();
      return sortOrder === "newest" ? secondTime - firstTime : firstTime - secondTime;
    });
  }, [farms, searchQuery, sortOrder]);

  const openCreateForm = () => {
    setSelectedFarm(null);
    setFormError(null);
    setFormMode("create");
  };

  const openEditForm = (farm: Farm) => {
    setSelectedFarm(farm);
    setFormError(null);
    setFormMode("edit");
  };

  const closeForm = () => {
    setSelectedFarm(null);
    setFormError(null);
    setFormMode("closed");
  };

  const handleSubmit = async (payload: FarmPayload) => {
    setFormError(null);

    try {
      if (formMode === "edit" && selectedFarm) {
        await updateFarm(selectedFarm.id, payload);
        await loadFarms();
        closeForm();
        showToast({
          title: "Farm updated",
          description: `${payload.name} was updated successfully.`,
        });
        return;
      }

      await createFarm(payload);
      closeForm();
      showToast({
        title: "Farm created",
        description: `${payload.name} was added to the platform.`,
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to save farm.";
      setFormError(message);
      showToast({
        title: "Save failed",
        description: message,
        variant: "error",
      });
    }
  };

  const handleDelete = async (farm: Farm) => {
    setFarmToDelete(farm);
  };

  const confirmDelete = async () => {
    if (!farmToDelete) {
      return;
    }

    try {
      await deleteFarm(farmToDelete.id);
      showToast({
        title: "Farm deleted",
        description: `${farmToDelete.name} was removed from the platform.`,
      });
      setFarmToDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete farm.";
      showToast({
        title: "Delete failed",
        description: message,
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Farm Network"
        title="Agricultural sites"
        description="Manage the farms that anchor field stations, sensor deployments and telemetry coverage."
        icon={Sprout}
        actions={
          <>
            <Button type="button" variant="outline" onClick={loadFarms} disabled={isLoading || isSaving}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Button type="button" onClick={openCreateForm} disabled={isSaving}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New farm
            </Button>
          </>
        }
      >

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total farms" value={farms.length} description="Registered farm sites" icon={Sprout} />
          <MetricCard title="Active stations" value={activeStations} description="Operational station records" icon={RadioTower} />
          <MetricCard title="Connected sensors" value={sensors.length} description="Sensors across all stations" icon={Cpu} />
          <MetricCard title="Latest update" value={latestUpdate} description="Most recent farm record change" icon={CalendarClock} />
        </div>
      </PageHeader>

      {error ? <Alert>{error}</Alert> : null}

      {formMode === "create" ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Create farm</CardTitle>
            <CardDescription>Add a farm to the monitoring platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <FarmForm
              error={formError}
              isSaving={isSaving}
              onCancel={closeForm}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Farm portfolio</CardTitle>
            <CardDescription>{visibleFarms.length} farms shown</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px] lg:w-[520px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                className="pl-9"
                placeholder="Search farms..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as FarmSort)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : farms.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No farms found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create the first farm to start organizing stations.</p>
              <Button className="mt-4" type="button" onClick={openCreateForm}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create farm
              </Button>
            </div>
          ) : visibleFarms.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No farms match your search</p>
              <p className="mt-1 text-sm text-muted-foreground">Adjust the search term or sorting option.</p>
            </div>
          ) : (
            <FarmTable farms={visibleFarms} isSaving={isSaving} onEdit={openEditForm} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formMode === "edit"}
        title="Edit farm"
        description="Update the selected farm details. Changes are saved to the NEXUS API."
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            closeForm();
          }
        }}
      >
        <FarmForm
          farm={selectedFarm}
          error={formError}
          isSaving={isSaving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Dialog>

      <ConfirmDialog
        open={farmToDelete !== null}
        title="Delete farm"
        description={
          farmToDelete
            ? `This will permanently delete "${farmToDelete.name}". This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete farm"
        isLoading={isSaving}
        onCancel={() => setFarmToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
