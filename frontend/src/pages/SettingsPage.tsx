import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Save, Shield, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationalBadge } from "@/components/shared/OperationalBadge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api";
import { userService } from "@/services/userService";
import type { User } from "@/types/user";
import { formatDateTime } from "@/utils/format";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(150),
  email: z.string().trim().email("Please enter a valid email address.").max(180),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must contain at least 8 characters."),
  confirmPassword: z.string().min(8, "Please confirm the new password."),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const profileErrorMessages = {
  badRequest: "Please check your profile details.",
  conflict: "An account with this email already exists.",
  serverError: "Something went wrong on our side. Please try again in a few moments.",
};

export function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [account, setAccount] = useState<User | null>(user);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: account?.fullName ?? "",
      email: account?.email ?? "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      try {
        const currentUser = await userService.currentUser();
        if (!ignore) {
          setAccount(currentUser);
        }
      } catch (error) {
        if (!ignore) {
          setProfileError(getApiErrorMessage(error, profileErrorMessages));
        }
      }
    }

    void loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  const saveProfile = async (values: ProfileFormValues) => {
    setProfileError(null);
    try {
      const updatedUser = await userService.updateProfile(values);
      setAccount(updatedUser);
      showToast({ title: "Profile updated", description: "Your account details were saved." });
    } catch (error) {
      const message = getApiErrorMessage(error, profileErrorMessages);
      setProfileError(message);
      showToast({ title: "Profile update failed", description: message, variant: "error" });
    }
  };

  const changePassword = async (values: PasswordFormValues) => {
    setPasswordError(null);
    try {
      await userService.updatePassword(values);
      passwordForm.reset();
      showToast({ title: "Password updated", description: "Your password was changed successfully." });
    } catch (error) {
      const message = getApiErrorMessage(error, {
        badRequest: "Please check your password details.",
        serverError: "Something went wrong on our side. Please try again in a few moments.",
      });
      setPasswordError(message);
      showToast({ title: "Password update failed", description: message, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your NEXUS profile, password and account information."
        icon={UserCog}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={profileForm.handleSubmit(saveProfile)}>
              {profileError ? <Alert>{profileError}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...profileForm.register("fullName")} />
                {profileForm.formState.errors.fullName ? <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...profileForm.register("email")} />
                {profileForm.formState.errors.email ? <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p> : null}
              </div>
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {profileForm.formState.isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password using your current password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={passwordForm.handleSubmit(changePassword)}>
              {passwordError ? <Alert>{passwordError}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input id="currentPassword" type="password" autoComplete="current-password" {...passwordForm.register("currentPassword")} />
                {passwordForm.formState.errors.currentPassword ? <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" type="password" autoComplete="new-password" {...passwordForm.register("newPassword")} />
                {passwordForm.formState.errors.newPassword ? <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword ? <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p> : null}
              </div>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                {passwordForm.formState.isSubmitting ? "Changing..." : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Read-only account metadata.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <Badge className="mt-2">{account?.role.replace("_", " ") ?? "Unknown"}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account status</p>
            <div className="mt-2">{account ? <OperationalBadge value={account.status} /> : null}</div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="mt-2 text-sm font-medium">{formatDateTime(account?.createdAt ?? null)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Session</CardTitle>
              <CardDescription>JWT/session duration is configured by backend security settings.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
