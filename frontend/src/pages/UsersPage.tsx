import { BarChart3, Building2, Check, Eye, EyeOff, MapPin, Plus, RefreshCcw, Shield, UserX, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { SearchInput } from "@/components/shared/SearchInput";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFarms } from "@/hooks/useFarms";
import { useAuth } from "@/hooks/useAuth";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useStations } from "@/hooks/useStations";
import { useToast } from "@/hooks/useToast";
import { useUsers } from "@/hooks/useUsers";
import { getApiErrorMessage } from "@/lib/api";
import { filterStationsByCategory, filterVariablesForGraphStation } from "@/lib/restrictedStationDashboard";
import { graphService } from "@/services/graphService";
import { measurementVariableService } from "@/services/measurementVariableService";
import { userService } from "@/services/userService";
import type { GraphAxis, GraphSeriesType, StationCategory, UserGraphConfiguration, UserGraphPayload } from "@/types/graph";
import type { MeasurementVariable } from "@/types/measurementVariable";
import type { Role, User, UserPayload, UserPermissions, UserStatus } from "@/types/user";
import { formatDateTime } from "@/utils/format";

type FormMode = "closed" | "create" | "edit";
type RoleFilter = "ALL" | Role;
type UserFormValues = UserPayload & {
  confirmPassword?: string;
  chartVariableIds?: number[];
  newPassword?: string;
  confirmNewPassword?: string;
};
type UserFieldErrors = Partial<Record<keyof UserFormValues, string>>;
type GraphVariableFormValue = { variableId: number; axis: GraphAxis; chartType: GraphSeriesType; displayOrder: number; customLabel?: string | null };
type GraphFormValues = Omit<UserGraphPayload, "stationId" | "variables"> & { variables: GraphVariableFormValue[] };

const baseUserSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(150),
  email: z.string().trim().email("Please enter a valid email address.").max(180),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"]),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(8, "Password must contain at least 8 characters."),
  confirmPassword: z.string().min(1, "Please confirm the password."),
});

const superAdminRoleFilterOptions: Array<{ label: string; value: RoleFilter }> = [
  { label: "All", value: "ALL" },
  { label: "SUPER_ADMIN", value: "SUPER_ADMIN" },
  { label: "ADMIN", value: "ADMIN" },
  { label: "TECHNICIAN", value: "TECHNICIAN" },
  { label: "VIEWER", value: "VIEWER" },
];

const adminRoleFilterOptions: Array<{ label: string; value: RoleFilter }> = [
  { label: "All", value: "ALL" },
  { label: "TECHNICIAN", value: "TECHNICIAN" },
  { label: "VIEWER", value: "VIEWER" },
];

function formatMeasurementType(type: string) {
  return type.replaceAll("_", " ");
}

interface FormSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-4 rounded-lg border bg-background/60 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function toggleNumber(values: number[], value: number) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function variableLabel(variable: MeasurementVariable) {
  return variable.displayName?.trim() || variable.code;
}

function variableGroup() {
  return "Imported measurement variables";
}

function variableDescription(variable: MeasurementVariable, stationNameById: Map<number, string>) {
  const parts = [stationNameById.get(variable.stationId) ?? `Station #${variable.stationId}`, variable.code];
  if (variable.unit) {
    parts.push(variable.unit);
  }
  return parts.join(" - ");
}

function isValidGraphAxis(value: unknown): value is GraphAxis {
  return value === "PRIMARY" || value === "SECONDARY";
}

function isValidGraphSeriesType(value: unknown): value is GraphSeriesType {
  return value === "LINE" || value === "BAR";
}

export function UsersPage() {
  const { users, isLoading, isSaving, error, loadUsers, createUser, updateUser, updateUserStatus, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const { farms } = useFarms();
  const { stations } = useStations();
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [availableVariables, setAvailableVariables] = useState<MeasurementVariable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(false);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDisable, setUserToDisable] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({});
  const [farmSearch, setFarmSearch] = useState("");
  const [stationSearch, setStationSearch] = useState("");
  const [chartVariableSearch, setChartVariableSearch] = useState("");
  const [assignedGraphs, setAssignedGraphs] = useState<UserGraphConfiguration[]>([]);
  const [graphsLoading, setGraphsLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphStationId, setGraphStationId] = useState<number | null>(null);
  const [editingGraphId, setEditingGraphId] = useState<number | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [graphForm, setGraphForm] = useState<GraphFormValues>({
    title: "",
    description: "",
    stationCategory: "METEO",
    yAxisMin: 0,
    yAxisMax: 100,
    primaryAxisLabel: "",
    primaryAxisUnit: "",
    secondaryAxisEnabled: false,
    secondaryAxisLabel: "",
    secondaryAxisUnit: "",
    secondaryAxisMin: null,
    secondaryAxisMax: null,
    displayOrder: 1,
    active: true,
    variables: [],
  });
  const [formValues, setFormValues] = useState<UserFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    role: "VIEWER",
    status: "ACTIVE",
    chartVariableIds: [],
  });
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

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
          setPermissions(null);
        }
      }
    }

    void loadPermissions();

    return () => {
      ignore = true;
    };
  }, []);

  const canManageUser = (user: User) => {
    if (!currentUser) {
      return false;
    }

    if (isSuperAdmin) {
      return user.id !== currentUser.id;
    }

    return user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.id !== currentUser.id;
  };

  const availableRoles: Role[] = isSuperAdmin ? ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] : ["TECHNICIAN", "VIEWER"];
  const availableRoleFilterOptions = isSuperAdmin ? superAdminRoleFilterOptions : adminRoleFilterOptions;
  const effectiveRoleFilter = availableRoleFilterOptions.some((option) => option.value === roleFilter) ? roleFilter : "ALL";
  const availableFarms = useMemo(() => {
    if (isSuperAdmin || !permissions) {
      return farms;
    }

    const allowedFarmIds = new Set(permissions.farmIds);
    return farms.filter((farm) => allowedFarmIds.has(farm.id));
  }, [farms, isSuperAdmin, permissions]);
  const availableStations = useMemo(() => {
    if (isSuperAdmin || !permissions) {
      return stations;
    }

    const allowedStationIds = new Set(permissions.stationIds);
    return stations.filter((station) => allowedStationIds.has(station.id));
  }, [isSuperAdmin, permissions, stations]);
  const assignableVariableIdSet = useMemo(() => {
    if (isSuperAdmin) {
      return null;
    }
    return new Set(permissions?.variableIds ?? []);
  }, [isSuperAdmin, permissions]);
  const farmNameById = useMemo(() => new Map(farms.map((farm) => [farm.id, farm.name])), [farms]);
  const stationNameById = useMemo(() => new Map(stations.map((station) => [station.id, `${station.name} (${station.code})`])), [stations]);
  const selectedFarmIds = useMemo(() => formValues.farmIds ?? [], [formValues.farmIds]);
  const selectedStationIds = useMemo(() => formValues.stationIds ?? [], [formValues.stationIds]);
  const selectedChartVariableIds = useMemo(() => formValues.chartVariableIds ?? [], [formValues.chartVariableIds]);
  const selectedFarmSet = useMemo(() => new Set(selectedFarmIds), [selectedFarmIds]);
  const selectedStationSet = useMemo(() => new Set(selectedStationIds), [selectedStationIds]);
  const selectedChartVariableSet = useMemo(() => new Set(selectedChartVariableIds), [selectedChartVariableIds]);
  const scopedStationIds = useMemo(() => {
    if (selectedStationIds.length > 0) {
      return selectedStationIds;
    }
    if (selectedFarmIds.length === 0) {
      return [];
    }
    return stations.filter((station) => selectedFarmSet.has(station.farmId)).map((station) => station.id);
  }, [selectedFarmIds.length, selectedStationIds, selectedFarmSet, stations]);
  const scopedStationSet = useMemo(() => new Set(scopedStationIds), [scopedStationIds]);
  const variableById = useMemo(() => new Map(availableVariables.map((variable) => [variable.id, variable])), [availableVariables]);
  const availableChartVariables = useMemo(() => {
    return availableVariables
      .filter((variable) => {
        if (!scopedStationSet.has(variable.stationId)) {
          return false;
        }
        if (isSuperAdmin) {
          return true;
        }
        if (!assignableVariableIdSet) {
          return false;
        }
        return assignableVariableIdSet.has(variable.id);
      })
      .sort((first, second) => {
        const firstStationIndex = scopedStationIds.indexOf(first.stationId);
        const secondStationIndex = scopedStationIds.indexOf(second.stationId);
        if (firstStationIndex !== secondStationIndex) {
          return firstStationIndex - secondStationIndex;
        }
        return variableLabel(first).localeCompare(variableLabel(second));
      });
  }, [assignableVariableIdSet, availableVariables, isSuperAdmin, scopedStationIds, scopedStationSet]);
  const visibleChartVariables = useMemo(() => {
    const query = chartVariableSearch.trim().toLowerCase();
    return availableChartVariables.filter((variable) => {
      const label = variableLabel(variable).toLowerCase();
      const type = variable.measurementType ? formatMeasurementType(variable.measurementType).toLowerCase() : "";
      const station = stationNameById.get(variable.stationId)?.toLowerCase() ?? "";
      return !query || [label, variable.code.toLowerCase(), type, station, variable.unit?.toLowerCase() ?? ""].some((value) => value.includes(query));
    });
  }, [availableChartVariables, chartVariableSearch, stationNameById]);
  const groupedChartVariables = useMemo(() => {
    const groups = new Map<string, MeasurementVariable[]>();
    visibleChartVariables.forEach((variable) => {
      const group = stationNameById.get(variable.stationId) ?? variableGroup();
      groups.set(group, [...(groups.get(group) ?? []), variable]);
    });
    return Array.from(groups.entries());
  }, [stationNameById, visibleChartVariables]);
  const visibleFarmOptions = useMemo(() => {
    const query = farmSearch.trim().toLowerCase();
    if (!query) {
      return availableFarms;
    }

    return availableFarms.filter((farm) => [farm.name, farm.location ?? ""].some((value) => value.toLowerCase().includes(query)));
  }, [availableFarms, farmSearch]);
  const visibleStationOptions = useMemo(() => {
    const query = stationSearch.trim().toLowerCase();
    return availableStations.filter((station) => {
      const matchesQuery = !query || [station.name, station.code].some((value) => value.toLowerCase().includes(query));
      return matchesQuery;
    });
  }, [availableStations, stationSearch]);
  const selectedFarmNames = selectedFarmIds.map((farmId) => farmNameById.get(farmId) ?? `Farm #${farmId}`);
  const selectedStationNames = selectedStationIds.map((stationId) => stationNameById.get(stationId) ?? `Station #${stationId}`);
  const selectedChartVariables = selectedChartVariableIds
    .map((variableId) => variableById.get(variableId))
    .filter((variable): variable is MeasurementVariable => Boolean(variable));
  const graphStationOptions = useMemo(() => {
    const selectedStations = availableStations.filter((station) => selectedStationSet.has(station.id));
    return filterStationsByCategory(selectedStations, graphForm.stationCategory);
  }, [availableStations, graphForm.stationCategory, selectedStationSet]);
  const validGraphStationId = graphStationId && graphStationOptions.some((station) => station.id === graphStationId) ? graphStationId : null;
  const graphVariableOptions = useMemo(() => {
    const selectedChartVariableSet = new Set(selectedChartVariableIds);
    return filterVariablesForGraphStation(availableChartVariables, stations, validGraphStationId, graphForm.stationCategory)
      .filter((variable) => selectedChartVariableSet.has(variable.id))
      .sort((first, second) => variableLabel(first).localeCompare(variableLabel(second)));
  }, [availableChartVariables, graphForm.stationCategory, selectedChartVariableIds, stations, validGraphStationId]);
  const validGraphVariableIds = useMemo(
    () => graphForm.variables.filter((variable) => graphVariableOptions.some((option) => option.id === variable.variableId)),
    [graphForm.variables, graphVariableOptions],
  );
  const validGraphVariableIdSet = useMemo(() => new Set(validGraphVariableIds.map((variable) => variable.variableId)), [validGraphVariableIds]);

  useEffect(() => {
    let ignore = false;

    async function loadVariablesForStations() {
      if (formMode === "closed") {
        setAvailableVariables([]);
        setVariablesLoading(false);
        setVariablesError(null);
        return;
      }

      if (scopedStationIds.length === 0) {
        await Promise.resolve();
        if (ignore) {
          return;
        }
        setAvailableVariables([]);
        setFormValues((current) => {
          if ((current.chartVariableIds ?? []).length === 0 && (current.variableIds ?? []).length === 0 && (current.allowedMeasurementTypes ?? []).length === 0) {
            return current;
          }
          return {
            ...current,
            chartVariableIds: [],
            variableIds: [],
            allowedMeasurementTypes: [],
          };
        });
        setVariablesLoading(false);
        setVariablesError(null);
        return;
      }

      setVariablesLoading(true);
      setVariablesError(null);

      try {
        const results = await Promise.all(
          scopedStationIds.map((stationId) => measurementVariableService.findAll({ stationId, active: true })),
        );
        if (ignore) {
          return;
        }

        const uniqueVariables = new Map<number, MeasurementVariable>();
        results.flat().forEach((variable) => uniqueVariables.set(variable.id, variable));
        const loadedVariables = Array.from(uniqueVariables.values());
        const assignableVariables = loadedVariables.filter((variable) => {
          if (isSuperAdmin) {
            return true;
          }
          if (!assignableVariableIdSet) {
            return false;
          }
          return assignableVariableIdSet.has(variable.id);
        });
        const assignableIds = new Set(assignableVariables.map((variable) => variable.id));

        setAvailableVariables(loadedVariables);
        setFormValues((current) => {
          const currentIds = current.chartVariableIds ?? [];
          const nextIds = currentIds.filter((variableId) => assignableIds.has(variableId));
          const unchanged =
            nextIds.length === currentIds.length &&
            nextIds.every((variableId, index) => variableId === currentIds[index]);
          if (unchanged) {
            return current;
          }
          showToast({
            title: "Chart Access updated",
            description: "Variables outside the current station access were removed.",
          });
          return {
            ...current,
            chartVariableIds: nextIds,
            variableIds: nextIds,
            allowedMeasurementTypes: [],
          };
        });
      } catch (loadError) {
        if (!ignore) {
          setAvailableVariables([]);
          setVariablesError(getApiErrorMessage(loadError));
        }
      } finally {
        if (!ignore) {
          setVariablesLoading(false);
        }
      }
    }

    void loadVariablesForStations();

    return () => {
      ignore = true;
    };
  }, [assignableVariableIdSet, formMode, isSuperAdmin, scopedStationIds, showToast]);

  useEffect(() => {
    const selectedIds = new Set(selectedChartVariableIds);
    // Keep hidden graph-variable state aligned with the current Chart Access.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGraphForm((current) => {
      const nextVariables = current.variables.filter((variable) => {
        const measurementVariable = variableById.get(variable.variableId);
        return selectedIds.has(variable.variableId) && (!validGraphStationId || measurementVariable?.stationId === validGraphStationId);
      });
      if (nextVariables.length === current.variables.length) {
        return current;
      }
      setGraphError("Graph variables outside the current Chart Access were removed.");
      return { ...current, variables: nextVariables };
    });
  }, [selectedChartVariableIds, validGraphStationId, variableById]);

  const applyChartVariableIds = (variableIds: number[]) => {
    setGraphError(null);
    setFormValues((current) => ({
      ...current,
      chartVariableIds: variableIds,
      variableIds,
      allowedMeasurementTypes: [],
    }));
  };

  const handleRoleChange = (role: Role) => {
    setFormValues((current) => ({
      ...current,
      role,
      allowedMeasurementTypes: [],
    }));
  };

  const visibleUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = effectiveRoleFilter === "ALL" || user.role === effectiveRoleFilter;
      const matchesSearch =
        !normalizedQuery ||
        [user.fullName, user.email, user.role, user.status].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesRole && matchesSearch;
    });
  }, [effectiveRoleFilter, searchQuery, users]);
  const usersPagination = useClientPagination(visibleUsers, 10);

  const openCreateForm = () => {
    setSelectedUser(null);
    setFormError(null);
    setFieldErrors({});
    setFarmSearch("");
    setStationSearch("");
    setChartVariableSearch("");
    setAssignedGraphs([]);
    setGraphError(null);
    setGraphStationId(null);
    setShowAdminPassword(false);
    setFormValues({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      role: "VIEWER",
      status: "ACTIVE",
      farmIds: [],
      stationIds: [],
      allowedMeasurementTypes: [],
      chartVariableIds: [],
    });
    setFormMode("create");
  };

  const openEditForm = (user: User) => {
    if (!canManageUser(user)) {
      showToast({ title: "Action not allowed", description: "You do not have permission to perform this action.", variant: "error" });
      return;
    }

    setSelectedUser(user);
    setFormError(null);
    setFieldErrors({});
    setFarmSearch("");
    setStationSearch("");
    setChartVariableSearch("");
    setAssignedGraphs([]);
    setGraphError(null);
    setGraphStationId(null);
    setEditingGraphId(null);
    setShowAdminPassword(false);
    setGraphForm({
      title: "",
      description: "",
      stationCategory: "METEO",
      yAxisMin: 0,
      yAxisMax: 100,
      primaryAxisLabel: "",
      primaryAxisUnit: "",
      secondaryAxisEnabled: false,
      secondaryAxisLabel: "",
      secondaryAxisUnit: "",
      secondaryAxisMin: null,
      secondaryAxisMax: null,
      displayOrder: 1,
      active: true,
      variables: [],
    });
    setFormValues({
      fullName: user.fullName,
      email: user.email,
      password: "",
      confirmPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      role: user.role,
      status: user.status,
      farmIds: user.farmIds ?? [],
      stationIds: user.stationIds ?? [],
      variableIds: user.variableIds ?? [],
      allowedMeasurementTypes: user.allowedMeasurementTypes ?? [],
      chartVariableIds: user.variableIds ?? [],
    });
    setFormMode("edit");
    void loadAssignedGraphs(user.id);
  };

  const closeForm = () => {
    setFormMode("closed");
    setSelectedUser(null);
    setFormError(null);
    setFieldErrors({});
    setGraphError(null);
    setGraphStationId(null);
    setEditingGraphId(null);
    setShowAdminPassword(false);
  };

  const loadAssignedGraphs = async (userId: number) => {
    setGraphsLoading(true);
    setGraphError(null);
    try {
      const graphs = await graphService.findForUser(userId);
      setAssignedGraphs(graphs);
      setGraphForm((current) => ({ ...current, displayOrder: graphs.length + 1 }));
    } catch (loadError) {
      setGraphError(getApiErrorMessage(loadError));
    } finally {
      setGraphsLoading(false);
    }
  };

  const saveGraph = async () => {
    if (!selectedUser) {
      return;
    }
    setGraphError(null);
    const selectedVariables = [...validGraphVariableIds].sort((first, second) => first.displayOrder - second.displayOrder);
    const validationErrors: string[] = [];
    if (!Number.isInteger(selectedUser.id) || selectedUser.id <= 0) {
      validationErrors.push("A valid target user is required.");
    }
    if (!Number.isInteger(validGraphStationId) || (validGraphStationId ?? 0) <= 0) {
      validationErrors.push("A valid station must be selected.");
    }
    if (!graphForm.title.trim()) {
      validationErrors.push("Graph title is required.");
    }
    const graphOrder = Number(graphForm.displayOrder);
    if (!Number.isInteger(graphOrder) || graphOrder < 1) {
      validationErrors.push("Graph order must be greater than zero.");
    }
    const primaryMin = Number(graphForm.yAxisMin);
    const primaryMax = Number(graphForm.yAxisMax);
    if (!Number.isFinite(primaryMin)) {
      validationErrors.push("Primary minimum is required.");
    }
    if (!Number.isFinite(primaryMax)) {
      validationErrors.push("Primary maximum is required.");
    }
    if (Number.isFinite(primaryMin) && Number.isFinite(primaryMax) && primaryMax <= primaryMin) {
      validationErrors.push("Primary minimum must be lower than primary maximum.");
    }
    if (selectedVariables.length === 0) {
      validationErrors.push("Select at least one variable.");
    }
    if (graphForm.variables.length !== selectedVariables.length) {
      setGraphForm((current) => ({ ...current, variables: selectedVariables }));
    }
    selectedVariables.forEach((variable) => {
      const measurementVariable = variableById.get(variable.variableId);
      const label = measurementVariable ? variableLabel(measurementVariable) : `#${variable.variableId}`;
      if (!Number.isInteger(variable.variableId) || variable.variableId <= 0) {
        validationErrors.push(`Variable "${label}" requires a valid measurement variable ID.`);
      }
      if (!measurementVariable) {
        validationErrors.push(`Variable "${label}" is no longer available for the selected station and Chart Access.`);
      }
      if (!isValidGraphAxis(variable.axis)) {
        validationErrors.push(`Variable "${label}" requires an axis assignment.`);
      }
      if (!isValidGraphSeriesType(variable.chartType)) {
        validationErrors.push(`Variable "${label}" requires a chart type.`);
      }
      if (!Number.isInteger(variable.displayOrder) || variable.displayOrder < 1) {
        validationErrors.push(`Variable "${label}" requires a display order greater than zero.`);
      }
      if (variable.axis === "SECONDARY" && !graphForm.secondaryAxisEnabled) {
        validationErrors.push(`Secondary axis is disabled but variable "${label}" is assigned to it.`);
      }
    });
    const usesSecondaryAxis = selectedVariables.some((variable) => variable.axis === "SECONDARY");
    const secondaryMin = graphForm.secondaryAxisMin === null ? null : Number(graphForm.secondaryAxisMin);
    const secondaryMax = graphForm.secondaryAxisMax === null ? null : Number(graphForm.secondaryAxisMax);
    if (graphForm.secondaryAxisEnabled && !usesSecondaryAxis) {
      validationErrors.push("Secondary axis is enabled but no selected variable uses it.");
    }
    if (graphForm.secondaryAxisEnabled) {
      if (secondaryMin !== null && !Number.isFinite(secondaryMin)) {
        validationErrors.push("Secondary minimum must be a valid number.");
      }
      if (secondaryMax !== null && !Number.isFinite(secondaryMax)) {
        validationErrors.push("Secondary maximum must be a valid number.");
      }
      if ((secondaryMin === null) !== (secondaryMax === null)) {
        validationErrors.push("Secondary minimum and maximum must both be filled or both left empty.");
      }
      if (secondaryMin !== null && secondaryMax !== null && Number.isFinite(secondaryMin) && Number.isFinite(secondaryMax) && secondaryMax <= secondaryMin) {
        validationErrors.push("Secondary minimum must be lower than secondary maximum.");
      }
    }
    if (validationErrors.length > 0) {
      setGraphError(validationErrors.join(" "));
      return;
    }
    const stationId = validGraphStationId ?? 0;
    const payload: UserGraphPayload = {
      ...graphForm,
      stationId,
      title: graphForm.title.trim(),
      description: graphForm.description?.trim() || null,
      displayOrder: graphOrder,
      yAxisMin: primaryMin,
      yAxisMax: primaryMax,
      secondaryAxisMin: graphForm.secondaryAxisEnabled ? secondaryMin : null,
      secondaryAxisMax: graphForm.secondaryAxisEnabled ? secondaryMax : null,
      variables: selectedVariables.map((variable) => ({ ...variable, displayOrder: variable.displayOrder })),
    };
    setGraphsLoading(true);
    try {
      const userPayload: UserPayload = {
        fullName: formValues.fullName,
        email: formValues.email,
        role: formValues.role,
        status: formValues.status,
        farmIds: formValues.farmIds ?? [],
        stationIds: formValues.stationIds ?? [],
        variableIds: formValues.chartVariableIds ?? [],
        allowedMeasurementTypes: [],
      };
      await updateUser(selectedUser.id, userPayload);
      const isEditingPersistedGraph = editingGraphId !== null && assignedGraphs.some((graph) => graph.id === editingGraphId);
      if (isEditingPersistedGraph) {
        await graphService.updateForUser(selectedUser.id, editingGraphId, payload);
      } else {
        await graphService.createForUser(selectedUser.id, payload);
      }
      await loadAssignedGraphs(selectedUser.id);
      setEditingGraphId(null);
      setGraphStationId(null);
      setGraphForm((current) => ({ ...current, title: "", description: "", variables: [], displayOrder: assignedGraphs.length + 2 }));
      showToast({ title: isEditingPersistedGraph ? "Graph updated" : "Graph assigned", description: "The graph configuration was saved." });
    } catch (saveError) {
      setGraphError(getApiErrorMessage(saveError));
    } finally {
      setGraphsLoading(false);
    }
  };

  const editGraph = (graph: UserGraphConfiguration) => {
    setEditingGraphId(graph.id);
    setGraphStationId(graph.stationId);
    setGraphForm({
      title: graph.title,
      description: graph.description ?? "",
      stationCategory: graph.stationCategory,
      yAxisMin: Number(graph.yAxisMin),
      yAxisMax: Number(graph.yAxisMax),
      primaryAxisLabel: graph.primaryAxisLabel ?? "",
      primaryAxisUnit: graph.primaryAxisUnit ?? "",
      secondaryAxisEnabled: graph.secondaryAxisEnabled,
      secondaryAxisLabel: graph.secondaryAxisLabel ?? "",
      secondaryAxisUnit: graph.secondaryAxisUnit ?? "",
      secondaryAxisMin: graph.secondaryAxisMin,
      secondaryAxisMax: graph.secondaryAxisMax,
      displayOrder: graph.displayOrder,
      active: graph.active,
      variables: graph.variables
        .filter((variable) => variable.variableId !== null)
        .map((variable) => ({
          variableId: variable.variableId ?? 0,
          axis: variable.axis ?? "PRIMARY",
          chartType: variable.chartType ?? "LINE",
          displayOrder: variable.displayOrder,
          customLabel: variable.customLabel,
        })),
    });
  };

  const removeGraph = async (graphId: number) => {
    if (!selectedUser) {
      return;
    }
    setGraphsLoading(true);
    setGraphError(null);
    try {
      await graphService.removeForUser(selectedUser.id, graphId);
      if (editingGraphId === graphId) {
        setEditingGraphId(null);
      }
      await loadAssignedGraphs(selectedUser.id);
      showToast({ title: "Graph removed", description: "The graph configuration was removed." });
    } catch (removeError) {
      setGraphError(getApiErrorMessage(removeError));
    } finally {
      setGraphsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const result = (formMode === "create" ? createUserSchema : baseUserSchema).safeParse(formValues);
    if (!result.success) {
      const nextFieldErrors = result.error.issues.reduce<UserFieldErrors>((errors, issue) => {
        const field = issue.path[0] as keyof UserFormValues | undefined;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
        return errors;
      }, {});
      setFieldErrors(nextFieldErrors);
      setFormError(result.error.issues[0]?.message ?? "Please check the user details.");
      return;
    }

    if (formMode === "create" && formValues.password !== formValues.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      setFormError("Passwords do not match.");
      return;
    }
    const wantsPasswordReset = formMode === "edit" && Boolean((formValues.newPassword ?? "") || (formValues.confirmNewPassword ?? ""));
    if (wantsPasswordReset) {
      if (!formValues.newPassword) {
        setFieldErrors({ newPassword: "New password is required." });
        setFormError("New password is required.");
        return;
      }
      if (formValues.newPassword.length < 8 || formValues.newPassword.length > 128) {
        setFieldErrors({ newPassword: "Password must contain between 8 and 128 characters." });
        setFormError("Password must contain between 8 and 128 characters.");
        return;
      }
      if (!formValues.confirmNewPassword) {
        setFieldErrors({ confirmNewPassword: "Please confirm the new password." });
        setFormError("Please confirm the new password.");
        return;
      }
      if (formValues.newPassword !== formValues.confirmNewPassword) {
        setFieldErrors({ confirmNewPassword: "Passwords do not match." });
        setFormError("Passwords do not match.");
        return;
      }
    }

    if (formValues.role !== "SUPER_ADMIN" && scopedStationIds.length > 0 && selectedChartVariableIds.length === 0) {
      setFieldErrors({ chartVariableIds: "Select at least one measurement variable." });
      setFormError("Select at least one measurement variable for chart access.");
      return;
    }

    try {
      const payload: UserPayload = {
        fullName: formValues.fullName,
        email: formValues.email,
        role: formValues.role,
        status: formValues.status,
        farmIds: formValues.farmIds ?? [],
        stationIds: formValues.stationIds ?? [],
        variableIds: formValues.chartVariableIds ?? [],
        allowedMeasurementTypes: [],
        ...(formMode === "create" ? { password: formValues.password } : {}),
      };
      if (formMode === "edit" && selectedUser) {
        await updateUser(selectedUser.id, payload);
        if (wantsPasswordReset) {
          try {
            await userService.resetPassword(selectedUser.id, {
              newPassword: formValues.newPassword ?? "",
              confirmPassword: formValues.confirmNewPassword ?? "",
            });
            setFormValues((current) => ({ ...current, newPassword: "", confirmNewPassword: "" }));
            showToast({ title: "User updated", description: `${payload.fullName} was updated and the password was reset.` });
          } catch (passwordError) {
            const message = getApiErrorMessage(passwordError, { badRequest: "Please check the password details." });
            setFormError(`User details were updated, but password reset failed: ${message}`);
            showToast({ title: "Password reset failed", description: message, variant: "error" });
            return;
          }
        } else {
          showToast({ title: "User updated", description: `${payload.fullName} was updated.` });
        }
      } else {
        await createUser(payload);
        showToast({ title: "User created", description: `${payload.fullName} can now access NEXUS.` });
      }
      closeForm();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save user.";
      setFormError(message);
      showToast({ title: "Save failed", description: message, variant: "error" });
    }
  };

  const confirmDisable = async () => {
    if (!userToDisable) {
      return;
    }

    try {
      await updateUserStatus(userToDisable.id, "DISABLED");
      showToast({ title: "User disabled", description: `${userToDisable.fullName} can no longer sign in.` });
      setUserToDisable(null);
    } catch (disableError) {
      const message = disableError instanceof Error ? disableError.message : "Unable to disable user.";
      showToast({ title: "Disable failed", description: message, variant: "error" });
    }
  };

  const activateUser = async (user: User) => {
    try {
      await updateUserStatus(user.id, "ACTIVE");
      showToast({ title: "User activated", description: `${user.fullName} can sign in again.` });
    } catch (activateError) {
      const message = activateError instanceof Error ? activateError.message : "Unable to activate user.";
      showToast({ title: "Activation failed", description: message, variant: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) {
      return;
    }

    try {
      await deleteUser(userToDelete.id);
      await loadUsers();
      showToast({ title: "User deleted", description: `${userToDelete.fullName} was permanently deleted.` });
      setUserToDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete user.";
      showToast({ title: "Delete failed", description: message, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="Users and roles"
        description="Manage administrator, technician and viewer access to the NEXUS platform."
        icon={Users}
        actions={
          <>
            <Button type="button" variant="outline" onClick={loadUsers} disabled={isLoading || isSaving}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Button type="button" onClick={openCreateForm} disabled={isSaving}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New user
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Total users" value={users.length} description="Registered platform accounts" icon={Users} />
          <MetricCard title="Administrators" value={users.filter((user) => user.role === "SUPER_ADMIN" || user.role === "ADMIN").length} description="Privileged access accounts" icon={Shield} />
          <MetricCard title="Disabled users" value={users.filter((user) => user.status === "DISABLED").length} description="Accounts without access" icon={UserX} />
        </div>
      </PageHeader>

      {error || variablesError ? <Alert>{error ?? variablesError}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>User directory</CardTitle>
            <CardDescription>{visibleUsers.length} users shown</CardDescription>
          </div>
          <div className="grid w-full items-center gap-3 sm:grid-cols-[12rem_minmax(0,24rem)] lg:w-auto">
            <Label htmlFor="roleFilter" className="sr-only">Filter by role</Label>
            <Select id="roleFilter" value={effectiveRoleFilter} onChange={(event) => { setRoleFilter(event.target.value as RoleFilter); usersPagination.resetPage(); }}>
              {availableRoleFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <SearchInput placeholder="Search users..." value={searchQuery} onChange={(value) => { setSearchQuery(value); usersPagination.resetPage(); }} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : visibleUsers.length === 0 ? (
            <EmptyState title="No users found" description="Create a user or adjust the search filter." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersPagination.paginatedItems.map((user) => (
                  <TableRow key={user.id} className="hover:bg-accent/30">
                    <TableCell>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <OperationalBadge value={user.status} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {(user.farmIds ?? []).slice(0, 2).map((farmId) => (
                            <Badge key={farmId}>{farmNameById.get(farmId) ?? `Farm #${farmId}`}</Badge>
                          ))}
                          {(user.farmIds ?? []).length > 2 ? <Badge>+{(user.farmIds ?? []).length - 2} farms</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(user.stationIds ?? []).slice(0, 2).map((stationId) => (
                            <Badge key={stationId}>{stationNameById.get(stationId) ?? `Station #${stationId}`}</Badge>
                          ))}
                          {(user.stationIds ?? []).length > 2 ? <Badge>+{(user.stationIds ?? []).length - 2} stations</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(user.allowedMeasurementTypes ?? []).slice(0, 2).map((measurementType) => (
                            <Badge key={measurementType}>{formatMeasurementType(measurementType)}</Badge>
                          ))}
                          {(user.allowedMeasurementTypes ?? []).length > 2 ? <Badge>+{(user.allowedMeasurementTypes ?? []).length - 2} measurements</Badge> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <ActionIconButton action="edit" label="Edit user" onClick={() => openEditForm(user)} disabled={isSaving || !canManageUser(user)} />
                        {user.status === "DISABLED" ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => activateUser(user)} disabled={isSaving || !canManageUser(user)}>
                            Activate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setUserToDisable(user)}
                            disabled={isSaving || !canManageUser(user)}
                          >
                            <UserX className="h-4 w-4" aria-hidden="true" />
                            Disable
                          </Button>
                        )}
                        {isSuperAdmin ? (
                          <ActionIconButton action="delete" label="Delete user" onClick={() => setUserToDelete(user)} disabled={isSaving || user.id === currentUser?.id} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {visibleUsers.length > 0 ? (
            <div className="mt-4">
              <PaginationControls
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                totalItems={usersPagination.totalItems}
                pageSize={usersPagination.pageSize}
                label="users"
                onPageChange={usersPagination.setPage}
                onPageSizeChange={usersPagination.setPageSize}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={formMode !== "closed"}
        title={formMode === "edit" ? "Edit user" : "Create user"}
        description="Configure account details, platform role and data access in one place."
        className="sm:max-w-5xl"
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            closeForm();
          }
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          {formError ? <Alert>{formError}</Alert> : null}

          <FormSection title="Account information" description="Basic identity used for sign-in and user directory records.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={formValues.fullName}
                  onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                  className={fieldErrors.fullName ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                {fieldErrors.fullName ? <p id="fullName-error" className="text-sm text-destructive">{fieldErrors.fullName}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                {fieldErrors.email ? <p id="email-error" className="text-sm text-destructive">{fieldErrors.email}</p> : null}
              </div>
            </div>
          </FormSection>

          {formMode === "edit" && selectedUser && canManageUser(selectedUser) ? (
            <FormSection title="Password reset" description="Leave blank to keep the current password. The current password is never displayed.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminNewPassword">New password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="adminNewPassword"
                      type={showAdminPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      value={formValues.newPassword ?? ""}
                      onChange={(event) => setFormValues((current) => ({ ...current, newPassword: event.target.value }))}
                      aria-invalid={Boolean(fieldErrors.newPassword)}
                      aria-describedby={fieldErrors.newPassword ? "adminNewPassword-error" : undefined}
                      className={fieldErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : undefined}
                    />
                    <Button type="button" variant="outline" size="icon" aria-label={showAdminPassword ? "Hide password" : "Show password"} onClick={() => setShowAdminPassword((current) => !current)}>
                      {showAdminPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                  </div>
                  {fieldErrors.newPassword ? <p id="adminNewPassword-error" className="text-sm text-destructive">{fieldErrors.newPassword}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminConfirmNewPassword">Confirm new password</Label>
                  <Input
                    id="adminConfirmNewPassword"
                    type={showAdminPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={formValues.confirmNewPassword ?? ""}
                    onChange={(event) => setFormValues((current) => ({ ...current, confirmNewPassword: event.target.value }))}
                    aria-invalid={Boolean(fieldErrors.confirmNewPassword)}
                    aria-describedby={fieldErrors.confirmNewPassword ? "adminConfirmNewPassword-error" : undefined}
                    className={fieldErrors.confirmNewPassword ? "border-destructive focus-visible:ring-destructive" : undefined}
                  />
                  {fieldErrors.confirmNewPassword ? <p id="adminConfirmNewPassword-error" className="text-sm text-destructive">{fieldErrors.confirmNewPassword}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormValues((current) => ({ ...current, newPassword: "", confirmNewPassword: "" }))}>
                  Clear password fields
                </Button>
              </div>
            </FormSection>
          ) : null}

          <FormSection title="Role and status" description="Control what this account can do inside the platform.">
            <div className="grid gap-4 md:grid-cols-4">
              {formMode === "create" ? (
                <>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={formValues.password ?? ""}
                      onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? "password-error" : undefined}
                      className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : undefined}
                    />
                    {fieldErrors.password ? <p id="password-error" className="text-sm text-destructive">{fieldErrors.password}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={formValues.confirmPassword ?? ""}
                      onChange={(event) => setFormValues((current) => ({ ...current, confirmPassword: event.target.value }))}
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                      className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : undefined}
                    />
                    {fieldErrors.confirmPassword ? <p id="confirmPassword-error" className="text-sm text-destructive">{fieldErrors.confirmPassword}</p> : null}
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="role">Platform role</Label>
                <Select id="role" value={formValues.role} onChange={(event) => handleRoleChange(event.target.value as Role)}>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Account status</Label>
                <Select id="status" value={formValues.status} onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value as UserStatus }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Data access scope" description="Choose farm context and the exact stations this user can access. Farm access does not grant all stations automatically.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                      Farm access
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedFarmIds.length} farms selected</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormValues((current) => ({ ...current, farmIds: availableFarms.map((farm) => farm.id) }))}>
                      Select all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormValues((current) => ({ ...current, farmIds: [] }))}>
                      Clear
                    </Button>
                  </div>
                </div>
                <SearchInput placeholder="Search farms..." value={farmSearch} onChange={setFarmSearch} />
                <div className="flex flex-wrap gap-2">
                  {selectedFarmNames.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Select at least one farm or station.</span>
                  ) : (
                    selectedFarmNames.map((name) => <Badge key={name}>{name}</Badge>)
                  )}
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {visibleFarmOptions.length === 0 ? (
                    <EmptyState title="No farms found" description="No farms match this search." />
                  ) : (
                    visibleFarmOptions.map((farm) => {
                      const checked = selectedFarmSet.has(farm.id);
                      return (
                        <label
                          key={farm.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-input accent-primary"
                            checked={checked}
                            onChange={() => setFormValues((current) => ({ ...current, farmIds: toggleNumber(current.farmIds ?? [], farm.id) }))}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{farm.name}</span>
                            <span className="block text-xs text-muted-foreground">{farm.location || "No location recorded"}</span>
                          </span>
                          {checked ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      Station access
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedStationIds.length} stations selected</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFormValues((current) => ({
                          ...current,
                          stationIds: availableStations
                            .filter((station) => selectedFarmIds.length === 0 || selectedFarmSet.has(station.farmId))
                            .map((station) => station.id),
                        }))
                      }
                    >
                      Select all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormValues((current) => ({ ...current, stationIds: [] }))}>
                      Clear
                    </Button>
                  </div>
                </div>
                <SearchInput placeholder="Search stations..." value={stationSearch} onChange={setStationSearch} />
                <div className="flex flex-wrap gap-2">
                  {selectedStationNames.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Select stations explicitly. Farm access alone does not grant station data.</span>
                  ) : (
                    selectedStationNames.map((name) => <Badge key={name}>{name}</Badge>)
                  )}
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {visibleStationOptions.length === 0 ? (
                    <EmptyState title="No stations found" description="No stations match this search." />
                  ) : (
                    visibleStationOptions.map((station) => {
                      const checked = selectedStationSet.has(station.id);
                      const unavailable = selectedFarmIds.length > 0 && !selectedFarmSet.has(station.farmId) && !checked;
                      return (
                        <label
                          key={station.id}
                          className={`flex items-start gap-3 rounded-md border bg-background p-3 transition-colors ${
                            unavailable ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary/50 hover:bg-accent/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-input accent-primary"
                            checked={checked}
                            disabled={unavailable}
                            onChange={() => setFormValues((current) => ({ ...current, stationIds: toggleNumber(current.stationIds ?? [], station.id) }))}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{station.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {station.code} - {farmNameById.get(station.farmId) ?? `Farm #${station.farmId}`}
                            </span>
                          </span>
                          {checked ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Chart access" description="Chart access controls which imported measurement variables this user can visualize in analytics and dashboards.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                {selectedChartVariableIds.length} variables selected
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => applyChartVariableIds(availableChartVariables.map((variable) => variable.id))} disabled={availableChartVariables.length === 0}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => applyChartVariableIds([])} disabled={selectedChartVariableIds.length === 0}>
                  Clear all
                </Button>
              </div>
            </div>

            {selectedChartVariables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedChartVariables.map((variable) => (
                  <Badge key={variable.id} className="gap-2">
                    {variableLabel(variable)}
                    <button
                      type="button"
                      className="rounded-full text-xs leading-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${variableLabel(variable)}`}
                      onClick={() => applyChartVariableIds(selectedChartVariableIds.filter((variableId) => variableId !== variable.id))}
                    >
                      x
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}

            {fieldErrors.chartVariableIds ? <p className="text-sm text-destructive">{fieldErrors.chartVariableIds}</p> : null}

            <div className="space-y-4">
              <SearchInput placeholder="Search variables..." value={chartVariableSearch} onChange={setChartVariableSearch} />
              {variablesError ? (
                <Alert>{variablesError}</Alert>
              ) : variablesLoading ? (
                <LoadingState rows={3} rowClassName="h-14" />
              ) : scopedStationIds.length === 0 ? (
                <EmptyState title="No stations selected" description="Select at least one station or farm to load assignable measurement variables." />
              ) : availableVariables.length === 0 ? (
                <EmptyState title="No active variables found" description="The selected stations do not currently have active imported measurement variables." />
              ) : availableChartVariables.length === 0 ? (
                <EmptyState title="No assignable variables" description="Your account cannot assign variables inside the selected station scope." />
              ) : groupedChartVariables.length === 0 ? (
                <EmptyState title="No variables found" description="No measurement variables match this search." />
              ) : (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {groupedChartVariables.map(([group, groupVariables]) => (
                    <div key={group} className="rounded-lg border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-medium">{group}</h4>
                        <span className="text-xs text-muted-foreground">{groupVariables.length} variables</span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {groupVariables.map((variable) => {
                          const checked = selectedChartVariableSet.has(variable.id);
                          return (
                            <label
                              key={variable.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 text-sm transition-colors hover:border-primary/50 hover:bg-accent/40 ${
                                checked ? "border-primary bg-primary/5 text-primary" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-input accent-primary"
                                checked={checked}
                                onChange={() => applyChartVariableIds(toggleNumber(selectedChartVariableIds, variable.id))}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {variableLabel(variable)}
                                  {variable.unit ? <span className="ml-1 text-xs text-muted-foreground">({variable.unit})</span> : null}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">{variableDescription(variable, stationNameById)}</span>
                              </span>
                              {checked ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          {formMode === "edit" && selectedUser && (formValues.role === "TECHNICIAN" || formValues.role === "VIEWER") ? (
            <FormSection title="Assigned graphs" description="Graph definitions are the effective visualization access for restricted users. Users see only these active graphs for explicitly assigned stations.">
              {graphError ? <Alert>{graphError}</Alert> : null}
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="graphTitle">Graph title</Label>
                      <Input id="graphTitle" value={graphForm.title} onChange={(event) => setGraphForm((current) => ({ ...current, title: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graphCategory">Category</Label>
                      <Select
                        id="graphCategory"
                        value={graphForm.stationCategory}
                        onChange={(event) => {
                          setGraphError(null);
                          setGraphStationId(null);
                          setGraphForm((current) => ({ ...current, stationCategory: event.target.value as StationCategory, variables: [] }));
                        }}
                      >
                        <option value="METEO">METEO</option>
                        <option value="FOS">FOS</option>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="graphStation">Station</Label>
                      <Select
                        id="graphStation"
                        value={validGraphStationId ?? ""}
                        onChange={(event) => {
                          setGraphError(null);
                          const nextStationId = event.target.value ? Number(event.target.value) : null;
                          setGraphStationId(nextStationId);
                          const nextVariables = filterVariablesForGraphStation(availableChartVariables, stations, nextStationId, graphForm.stationCategory);
                          setGraphForm((current) => ({
                            ...current,
                            variables: current.variables.filter((variable) => nextVariables.some((option) => option.id === variable.variableId)),
                          }));
                        }}
                      >
                        <option value="">Select a station</option>
                        {graphStationOptions.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.code} - {station.name}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-muted-foreground">Variables are loaded only from the selected station.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graphOrder">Order</Label>
                      <Input id="graphOrder" type="number" min="1" value={graphForm.displayOrder} onChange={(event) => setGraphForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graphPrimaryLabel">Primary axis label</Label>
                      <Input id="graphPrimaryLabel" value={graphForm.primaryAxisLabel ?? ""} onChange={(event) => setGraphForm((current) => ({ ...current, primaryAxisLabel: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graphPrimaryUnit">Primary axis unit</Label>
                      <Input id="graphPrimaryUnit" value={graphForm.primaryAxisUnit ?? ""} onChange={(event) => setGraphForm((current) => ({ ...current, primaryAxisUnit: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graphMin">Primary minimum</Label>
                      <Input id="graphMin" type="number" value={graphForm.yAxisMin} onChange={(event) => setGraphForm((current) => ({ ...current, yAxisMin: Number(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graphMax">Primary maximum</Label>
                      <Input id="graphMax" type="number" value={graphForm.yAxisMax} onChange={(event) => setGraphForm((current) => ({ ...current, yAxisMax: Number(event.target.value) }))} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={graphForm.secondaryAxisEnabled} onChange={(event) => setGraphForm((current) => ({ ...current, secondaryAxisEnabled: event.target.checked }))} />
                      Secondary Y axis
                    </label>
                    {graphForm.secondaryAxisEnabled ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="graphSecondaryLabel">Secondary axis label</Label>
                          <Input id="graphSecondaryLabel" value={graphForm.secondaryAxisLabel ?? ""} onChange={(event) => setGraphForm((current) => ({ ...current, secondaryAxisLabel: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graphSecondaryUnit">Secondary axis unit</Label>
                          <Input id="graphSecondaryUnit" value={graphForm.secondaryAxisUnit ?? ""} onChange={(event) => setGraphForm((current) => ({ ...current, secondaryAxisUnit: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graphSecondaryMin">Secondary minimum</Label>
                          <Input id="graphSecondaryMin" type="number" value={graphForm.secondaryAxisMin ?? ""} onChange={(event) => setGraphForm((current) => ({ ...current, secondaryAxisMin: event.target.value === "" ? null : Number(event.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graphSecondaryMax">Secondary maximum</Label>
                          <Input id="graphSecondaryMax" type="number" value={graphForm.secondaryAxisMax ?? ""} onChange={(event) => setGraphForm((current) => ({ ...current, secondaryAxisMax: event.target.value === "" ? null : Number(event.target.value) }))} />
                        </div>
                      </>
                    ) : null}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={graphForm.active} onChange={(event) => setGraphForm((current) => ({ ...current, active: event.target.checked }))} />
                      Active
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label>Variables</Label>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-background p-2">
                      {!validGraphStationId ? (
                        <p className="p-2 text-sm text-muted-foreground">Select a station before choosing graph variables.</p>
                      ) : graphVariableOptions.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground">No active variables are available for the selected station.</p>
                      ) : (
                        graphVariableOptions.map((variable) => (
                          <div key={variable.code} className="grid gap-2 rounded-md border px-2 py-2 text-sm sm:grid-cols-[1fr_120px_100px_72px]">
                            <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input accent-primary"
                              checked={validGraphVariableIdSet.has(variable.id)}
                              onChange={() =>
                                setGraphForm((current) => ({
                                  ...current,
                                  variables: validGraphVariableIdSet.has(variable.id)
                                    ? current.variables.filter((item) => item.variableId !== variable.id)
                                    : [...current.variables, { variableId: variable.id, axis: "PRIMARY", chartType: "LINE", displayOrder: current.variables.length + 1 }],
                                }))
                              }
                            />
                            <span>{variableLabel(variable)}{variable.unit ? ` (${variable.unit})` : ""}</span>
                            </label>
                            <Select
                              value={graphForm.variables.find((item) => item.variableId === variable.id)?.axis ?? "PRIMARY"}
                              disabled={!validGraphVariableIdSet.has(variable.id)}
                              onChange={(event) =>
                                setGraphForm((current) => ({
                                  ...current,
                                  variables: current.variables.map((item) => item.variableId === variable.id ? { ...item, axis: event.target.value as GraphAxis } : item),
                                }))
                              }
                            >
                              <option value="PRIMARY">Primary</option>
                              <option value="SECONDARY">Secondary</option>
                            </Select>
                            <Select
                              value={graphForm.variables.find((item) => item.variableId === variable.id)?.chartType ?? "LINE"}
                              disabled={!validGraphVariableIdSet.has(variable.id)}
                              onChange={(event) =>
                                setGraphForm((current) => ({
                                  ...current,
                                  variables: current.variables.map((item) => item.variableId === variable.id ? { ...item, chartType: event.target.value as GraphSeriesType } : item),
                                }))
                              }
                            >
                              <option value="LINE">Line</option>
                              <option value="BAR">Bar</option>
                            </Select>
                            <Input
                              type="number"
                              min="1"
                              value={graphForm.variables.find((item) => item.variableId === variable.id)?.displayOrder ?? ""}
                              disabled={!validGraphVariableIdSet.has(variable.id)}
                              onChange={(event) =>
                                setGraphForm((current) => ({
                                  ...current,
                                  variables: current.variables.map((item) => item.variableId === variable.id ? { ...item, displayOrder: Number(event.target.value) } : item),
                                }))
                              }
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <Button type="button" onClick={saveGraph} disabled={graphsLoading || graphVariableOptions.length === 0}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {editingGraphId ? "Update graph" : "Add graph"}
                  </Button>
                </div>

                <div className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{assignedGraphs.length} assigned graphs</p>
                    {graphsLoading ? <span className="text-xs text-muted-foreground">Saving...</span> : null}
                  </div>
                  {assignedGraphs.length === 0 ? (
                    <EmptyState title="No assigned graphs" description="Restricted users with no active graph configuration see no measurement graphs." />
                  ) : (
                    <div className="space-y-2">
                      {assignedGraphs.map((graph) => (
                        <div key={graph.id} className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{graph.title}</p>
                              <Badge>{graph.stationCategory}</Badge>
                              <Badge>{graph.active ? "Active" : "Inactive"}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Station: {graph.stationCode ?? "Unassigned"}{graph.stationName ? ` - ${graph.stationName}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Y {graph.yAxisMin} to {graph.yAxisMax} - {graph.variables.map((variable) => variable.displayName || variable.variableCode).join(", ")}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => editGraph(graph)} disabled={graphsLoading}>
                              Edit
                            </Button>
                            <ActionIconButton action="delete" label="Remove graph" onClick={() => removeGraph(graph.id)} disabled={graphsLoading} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </FormSection>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : formMode === "edit" ? "Update user" : "Create user"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={userToDisable !== null}
        title="Disable user"
        description={userToDisable ? `Disable access for "${userToDisable.fullName}"?` : "Disable this account?"}
        confirmLabel="Disable user"
        isLoading={isSaving}
        onCancel={() => setUserToDisable(null)}
        onConfirm={confirmDisable}
      />

      <ConfirmDialog
        open={userToDelete !== null}
        title="Delete user"
        description="Delete this user? This action cannot be undone."
        confirmLabel="Delete user"
        isLoading={isSaving}
        onCancel={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
