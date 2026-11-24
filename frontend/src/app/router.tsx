import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { LabsHub } from '../pages/LabsHub';
import { LabDetail } from '../pages/LabDetail';
import { Workstations } from '../pages/Workstations';
import { WorkstationDetail } from '../pages/WorkstationDetail';
import { ReportsCenter } from '../pages/ReportsCenter';
import { SoftwareInventory } from '../pages/SoftwareInventory';
import { AlgorithmLab } from '../pages/AlgorithmLab';
import { ActivityLog } from '../pages/ActivityLog';
import { Alerts } from '../pages/Alerts';
import { SettingsPage } from '../pages/SettingsPage';
import { Login } from '../pages/Login';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/login" element={<Login />} />

      {/* Core Redesigned Pages (10 Consolidated Workspaces) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labs"
        element={
          <ProtectedRoute>
            <LabsHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labs/:labId"
        element={
          <ProtectedRoute>
            <LabDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workstations"
        element={
          <ProtectedRoute>
            <Workstations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workstations/:id"
        element={
          <ProtectedRoute>
            <WorkstationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <ReportsCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/software"
        element={
          <ProtectedRoute>
            <SoftwareInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/algorithms"
        element={
          <ProtectedRoute>
            <AlgorithmLab />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <ActivityLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy URL Backward Compatibility Redirects */}
      <Route path="/devices" element={<Navigate to="/workstations" replace />} />
      <Route path="/processes" element={<Navigate to="/workstations" replace />} />
      <Route path="/cpu-analyzer" element={<Navigate to="/workstations" replace />} />
      <Route path="/memory-analyzer" element={<Navigate to="/workstations" replace />} />
      <Route path="/controller" element={<Navigate to="/workstations" replace />} />
      <Route path="/daily-reports" element={<Navigate to="/reports/daily" replace />} />
      <Route path="/deadlock" element={<Navigate to="/algorithms?tab=deadlock" replace />} />
      <Route path="/bankers" element={<Navigate to="/algorithms?tab=bankers" replace />} />
      <Route path="/logs" element={<Navigate to="/activity" replace />} />
      <Route path="/simulator" element={<Navigate to="/settings?tab=simulator" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
