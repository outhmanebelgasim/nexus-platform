import { UserPlus, Sprout } from "lucide-react";
import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthenticationFooter } from "@/components/auth/AuthenticationFooter";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { authService } from "@/services/authService";

type RegisterFieldErrors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;

export function RegisterPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFieldErrors: RegisterFieldErrors = {};

    if (!fullName.trim()) {
      nextFieldErrors.fullName = "Please complete all required fields.";
    }

    if (!email.trim()) {
      nextFieldErrors.email = "Please complete all required fields.";
    } else if (!email.includes("@")) {
      nextFieldErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      nextFieldErrors.password = "Please complete all required fields.";
    } else if (password.length < 8) {
      nextFieldErrors.password = "Password must contain at least 8 characters.";
    }

    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = "Please complete all required fields.";
    } else if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(Object.values(nextFieldErrors)[0] ?? "Please complete all required fields.");
      if (nextFieldErrors.fullName) {
        fullNameRef.current?.focus();
      } else if (nextFieldErrors.email) {
        emailRef.current?.focus();
      } else if (nextFieldErrors.password) {
        passwordRef.current?.focus();
      } else {
        confirmPasswordRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await authService.register({ fullName, email, password, confirmPassword });
      showToast({
        title: "Account created successfully.",
        description: "You can now sign in.",
      });
      navigate("/login", { replace: true });
    } catch (registerError) {
      const message = registerError instanceof Error ? registerError.message : "Your account could not be created. Please try again later.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex flex-1 items-center justify-center p-4 py-10">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sprout className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Create NEXUS account</CardTitle>
              <CardDescription>Register for viewer access to the monitoring workspace.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error ? <Alert>{error}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  ref={fullNameRef}
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                  className={fieldErrors.fullName ? "border-destructive focus-visible:ring-destructive" : undefined}
                  required
                />
                {fieldErrors.fullName ? <p id="fullName-error" className="text-sm text-destructive">{fieldErrors.fullName}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : undefined}
                  required
                />
                {fieldErrors.email ? <p id="email-error" className="text-sm text-destructive">{fieldErrors.email}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  ref={passwordRef}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : undefined}
                  required
                />
                {fieldErrors.password ? <p id="password-error" className="text-sm text-destructive">{fieldErrors.password}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  ref={confirmPasswordRef}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                  className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : undefined}
                  required
                />
                {fieldErrors.confirmPassword ? <p id="confirmPassword-error" className="text-sm text-destructive">{fieldErrors.confirmPassword}</p> : null}
              </div>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link className="font-medium text-primary hover:underline" to="/login">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
      <AuthenticationFooter />
    </main>
  );
}
