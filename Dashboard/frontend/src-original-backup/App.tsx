import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import EmployeesPage from "./pages/EmployeesPage";
import ShutterPage from "./pages/ShutterPage";
import CustomersPage from "./pages/CustomersPage";
import AlertsPage from "./pages/AlertsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<EmployeesPage />} />
        <Route path="shutter" element={<ShutterPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="alerts" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}
