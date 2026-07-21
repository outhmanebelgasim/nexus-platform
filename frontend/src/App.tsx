import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { navigationAccess } from "@/lib/navigationAccess";
import { AlertsPage } from "@/pages/AlertsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FarmsPage } from "@/pages/FarmsPage";
import { ImporterMonitoringPage } from "@/pages/ImporterMonitoringPage";
import { MeasurementsPage } from "@/pages/MeasurementsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StationsPage } from "@/pages/StationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { RestrictedStationsPage } from "@/pages/RestrictedStationsPage";
import { UsersPage } from "@/pages/UsersPage";
import { VariablesPage } from "@/pages/VariablesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<ProtectedRoute roles={navigationAccess.farms} />}>
            <Route path="/farms" element={<FarmsPage />} />
          </Route>
          <Route path="/stations" element={<StationsPage />} />
          <Route path="/variables" element={<VariablesPage />} />
          <Route path="/sensors" element={<Navigate to="/variables" replace />} />
          <Route path="/measurements" element={<MeasurementsPage />} />
          <Route element={<ProtectedRoute roles={navigationAccess.restrictedStations} />}>
            <Route path="/meteo-stations" element={<RestrictedStationsPage category="METEO" />} />
            <Route path="/meteo-stations/:stationId" element={<RestrictedStationsPage category="METEO" />} />
            <Route path="/fos-stations" element={<RestrictedStationsPage category="FOS" />} />
            <Route path="/fos-stations/:stationId" element={<RestrictedStationsPage category="FOS" />} />
          </Route>
          <Route path="/alerts" element={<AlertsPage />} />
          <Route element={<ProtectedRoute roles={navigationAccess.importMonitoring} />}>
            <Route path="/import-monitoring" element={<ImporterMonitoringPage />} />
            <Route path="/import-logs" element={<Navigate to="/import-monitoring" replace />} />
          </Route>
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<ProtectedRoute roles={navigationAccess.users} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
