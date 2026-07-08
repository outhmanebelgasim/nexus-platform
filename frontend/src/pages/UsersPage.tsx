import { Edit, Plus, RefreshCcw, Search, Shield, Trash2, UserX, Users } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useUsers } from "@/hooks/useUsers";
import type { Role, User, UserPayload, UserStatus } from "@/types/user";
import { formatDateTime } from "@/utils/format";

type FormMode = "closed" | "create" | "edit";
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

export function UsersPage() {
  const { users, isLoading, isSaving, error, loadUsers, createUser, updateUser, updateUserStatus, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDisable, setUserToDisable] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({});
  const [formValues, setFormValues] = useState<UserFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "VIEWER",
    status: "ACTIVE",
  });
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const canManageUser = (user: User) => {
    if (!currentUser) {
      return false;
    }

    if (isSuperAdmin) {
      return user.id !== currentUser.id;
    }

    return user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.id !== currentUser.id && user.id !== currentUser.createdById;
  };

  const availableRoles: Role[] = isSuperAdmin ? ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] : ["TECHNICIAN", "VIEWER"];

  const visibleUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [user.fullName, user.email, user.role, user.status].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [searchQuery, users]);

  const openCreateForm = () => {
    setSelectedUser(null);
    setFormError(null);
    setFieldErrors({});
    setFormValues({ fullName: "", email: "", password: "", confirmPassword: "", role: "VIEWER", status: "ACTIVE" });
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
    setFormValues({ fullName: user.fullName, email: user.email, password: "", confirmPassword: "", role: user.role, status: user.status });
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
          <div className="relative lg:w-96">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input className="pl-9" placeholder="Search users..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
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
        description="Assign a role and account status for platform access."
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            closeForm();
          }
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError ? <Alert>{formError}</Alert> : null}
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
          <div className="grid gap-4 sm:grid-cols-3">
            {formMode === "create" ? (
              <>
                <div className="space-y-2">
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
                <div className="space-y-2">
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
              <Label htmlFor="role">Role</Label>
              <Select id="role" value={formValues.role} onChange={(event) => setFormValues((current) => ({ ...current, role: event.target.value as Role }))}>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={formValues.status} onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value as UserStatus }))}>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </Select>
            </div>
          </div>
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
