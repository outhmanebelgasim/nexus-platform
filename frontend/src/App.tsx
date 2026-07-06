import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AlertsPage } from "@/pages/AlertsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FarmsPage } from "@/pages/FarmsPage";
import { ImportLogsPage } from "@/pages/ImportLogsPage";
import { MeasurementsPage } from "@/pages/MeasurementsPage";
import { SensorsPage } from "@/pages/SensorsPage";
import { StationsPage } from "@/pages/StationsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/stations" element={<StationsPage />} />
        <Route path="/sensors" element={<SensorsPage />} />
        <Route path="/measurements" element={<MeasurementsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/import-logs" element={<ImportLogsPage />} />
      </Route>
    </Routes>
  );
}
