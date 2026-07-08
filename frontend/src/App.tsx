import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AlertsPage } from "@/pages/AlertsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FarmsPage } from "@/pages/FarmsPage";
import { ImportLogsPage } from "@/pages/ImportLogsPage";
import { MeasurementsPage } from "@/pages/MeasurementsPage";
import { SensorsPage } from "@/pages/SensorsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StationsPage } from "@/pages/StationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { UsersPage } from "@/pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/farms" element={<FarmsPage />} />
          <Route path="/stations" element={<StationsPage />} />
          <Route path="/sensors" element={<SensorsPage />} />
          <Route path="/measurements" element={<MeasurementsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/import-logs" element={<ImportLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<ProtectedRoute roles={["SUPER_ADMIN", "ADMIN"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
