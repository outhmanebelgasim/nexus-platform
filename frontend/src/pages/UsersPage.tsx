import { BarChart3, Building2, Check, CloudSun, Cpu, Edit, Leaf, MapPin, Plus, RefreshCcw, Search, Shield, Sprout, Trash2, UserX, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { MetricCard } from "@/components/shared/MetricCard";
import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { useStations } from "@/hooks/useStations";
import { useToast } from "@/hooks/useToast";
import { useUsers } from "@/hooks/useUsers";
import { userService } from "@/services/userService";
import type { MeasurementType, Role, User, UserPayload, UserPermissions, UserStatus } from "@/types/user";
import { formatDateTime } from "@/utils/format";

type FormMode = "closed" | "create" | "edit";
type RoleFilter = "ALL" | Role;
type UserFormValues = UserPayload & {
  confirmPassword?: string;
};
type UserFieldErrors = Partial<Record<keyof UserFormValues, string>>;

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

const measurementGroups: Array<{ title: string; description: string; icon: typeof CloudSun; types: MeasurementType[] }> = [
  {
    title: "Weather",
    description: "Atmospheric and rainfall telemetry",
    icon: CloudSun,
    types: ["AIR_TEMPERATURE", "RELATIVE_HUMIDITY", "WIND_SPEED", "WIND_DIRECTION", "PRESSURE", "RAINFALL", "SOLAR_RADIATION"],
  },
  {
    title: "Soil",
    description: "Soil temperature and moisture signals",
    icon: Sprout,
    types: ["SOIL_TEMPERATURE", "SOIL_MOISTURE"],
  },
  {
    title: "Agronomy",
    description: "Crop water demand indicators",
    icon: Leaf,
    types: ["ET"],
  },
  {
    title: "System",
    description: "Device health and technical readings",
    icon: Cpu,
    types: ["BATTERY_VOLTAGE", "INTERNAL_TECHNICAL_DATA"],
  },
];

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

function toggleMeasurementType(values: MeasurementType[], value: MeasurementType) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function UsersPage() {
  const { users, isLoading, isSaving, error, loadUsers, createUser, updateUser, updateUserStatus, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const { farms } = useFarms();
  const { stations } = useStations();
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
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
  const [formValues, setFormValues] = useState<UserFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "VIEWER",
    status: "ACTIVE",
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
  const availableMeasurementTypes = isSuperAdmin || !permissions ? measurementTypeOptions : permissions.allowedMeasurementTypes;
  const farmNameById = useMemo(() => new Map(farms.map((farm) => [farm.id, farm.name])), [farms]);
  const stationNameById = useMemo(() => new Map(stations.map((station) => [station.id, `${station.name} (${station.code})`])), [stations]);
  const selectedFarmIds = formValues.farmIds ?? [];
  const selectedStationIds = formValues.stationIds ?? [];
  const selectedMeasurementTypes = formValues.allowedMeasurementTypes ?? [];
  const selectedFarmSet = useMemo(() => new Set(selectedFarmIds), [selectedFarmIds]);
  const selectedStationSet = useMemo(() => new Set(selectedStationIds), [selectedStationIds]);
  const selectedMeasurementSet = useMemo(() => new Set(selectedMeasurementTypes), [selectedMeasurementTypes]);
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

  const openCreateForm = () => {
    setSelectedUser(null);
    setFormError(null);
    setFieldErrors({});
    setFarmSearch("");
    setStationSearch("");
    setFormValues({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "VIEWER",
      status: "ACTIVE",
      farmIds: [],
      stationIds: [],
      allowedMeasurementTypes: [],
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
    setFormValues({
      fullName: user.fullName,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role,
      status: user.status,
      farmIds: user.farmIds ?? [],
      stationIds: user.stationIds ?? [],
      allowedMeasurementTypes: user.allowedMeasurementTypes ?? [],
    });
    setFormMode("edit");
  };

  const closeForm = () => {
    setFormMode("closed");
    setSelectedUser(null);
    setFormError(null);
    setFieldErrors({});
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

    try {
      const payload: UserPayload = {
        fullName: formValues.fullName,
        email: formValues.email,
        role: formValues.role,
        status: formValues.status,
        farmIds: formValues.farmIds ?? [],
        stationIds: formValues.stationIds ?? [],
        allowedMeasurementTypes: formValues.allowedMeasurementTypes ?? [],
        ...(formMode === "create" ? { password: formValues.password } : {}),
      };
      if (formMode === "edit" && selectedUser) {
        await updateUser(selectedUser.id, payload);
        showToast({ title: "User updated", description: `${payload.fullName} was updated.` });
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

      {error ? <Alert>{error}</Alert> : null}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>User directory</CardTitle>
            <CardDescription>{visibleUsers.length} users shown</CardDescription>
          </div>
          <div className="grid w-full items-center gap-3 sm:grid-cols-[12rem_minmax(0,24rem)] lg:w-auto">
            <Label htmlFor="roleFilter" className="sr-only">Filter by role</Label>
            <Select id="roleFilter" value={effectiveRoleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
              {availableRoleFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input className="pl-9" placeholder="Search users..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">No users found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a user or adjust the search filter.</p>
            </div>
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
                {visibleUsers.map((user) => (
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
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(user)} disabled={isSaving || !canManageUser(user)}>
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
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
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setUserToDelete(user)}
                            disabled={isSaving || user.id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
                <Select id="role" value={formValues.role} onChange={(event) => setFormValues((current) => ({ ...current, role: event.target.value as Role }))}>
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

          <FormSection title="Data access scope" description="Choose the farms and stations this user can see across operational screens.">
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
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input className="pl-9" placeholder="Search farms..." value={farmSearch} onChange={(event) => setFarmSearch(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFarmNames.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Select at least one farm or station.</span>
                  ) : (
                    selectedFarmNames.map((name) => <Badge key={name}>{name}</Badge>)
                  )}
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {visibleFarmOptions.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No farms match this search.</p>
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
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input className="pl-9" placeholder="Search stations..." value={stationSearch} onChange={(event) => setStationSearch(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStationNames.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Stations are optional when farm access covers the scope.</span>
                  ) : (
                    selectedStationNames.map((name) => <Badge key={name}>{name}</Badge>)
                  )}
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {visibleStationOptions.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No stations match this search.</p>
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

          <FormSection title="Chart access" description="Chart access controls which measurement types this user can visualize in analytics and dashboards.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                {selectedMeasurementTypes.length} measurement types selected
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormValues((current) => ({ ...current, allowedMeasurementTypes: availableMeasurementTypes }))}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormValues((current) => ({ ...current, allowedMeasurementTypes: [] }))}>
                  Clear
                </Button>
              </div>
            </div>
            {selectedMeasurementTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select at least one measurement type.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedMeasurementTypes.map((measurementType) => (
                  <Badge key={measurementType}>{formatMeasurementType(measurementType)}</Badge>
                ))}
              </div>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {measurementGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.title} className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-medium">{group.title}</h4>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.types.map((measurementType) => {
                        const checked = selectedMeasurementSet.has(measurementType);
                        const unavailable = !availableMeasurementTypes.includes(measurementType);
                        return (
                          <label
                            key={measurementType}
                            className={`flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm transition-colors ${
                              unavailable ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary/50 hover:bg-accent/40"
                            } ${checked ? "border-primary bg-primary/5 text-primary" : ""}`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input accent-primary"
                              checked={checked}
                              disabled={unavailable}
                              onChange={() =>
                                setFormValues((current) => ({
                                  ...current,
                                  allowedMeasurementTypes: toggleMeasurementType(current.allowedMeasurementTypes ?? [], measurementType),
                                }))
                              }
                            />
                            <span className="flex-1">{formatMeasurementType(measurementType)}</span>
                            {checked ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>

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
