import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import InvoiceDetails from "./pages/InvoiceDetails.jsx";
import Settings from "./pages/Settings.jsx";
import PayInvoice from "./pages/PayInvoice.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./layouts/AppLayout.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public invoice pay link (NO account required) */}
      <Route path="/pay/:token" element={<PayInvoice />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default when logged in */}
        <Route path="/" element={<Navigate to="/invoices" replace />} />

        {/* Main pages inside the layout */}
        <Route path="/invoices" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />

        {/* Invoice details still inside the same layout */}
        <Route path="/invoices/:id" element={<InvoiceDetails />} />

        {/* Backwards compat: if anything still links to /dashboard */}
        <Route path="/dashboard" element={<Navigate to="/invoices" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
