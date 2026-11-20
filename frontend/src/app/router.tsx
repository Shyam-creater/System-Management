import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { Devices } from '../pages/Devices';
import { Processes } from '../pages/Processes';
import { CPUAnalyzer } from '../pages/CPUAnalyzer';
import { MemoryAnalyzer } from '../pages/MemoryAnalyzer';
import { ProcessController } from '../pages/ProcessController';
import { Deadlock } from '../pages/Deadlock';
import { BankersAlgorithm } from '../pages/BankersAlgorithm';
import { Alerts } from '../pages/Alerts';
import { LogsPage } from '../pages/LogsPage';
import { Reports } from '../pages/Reports';
import { DailyReports } from '../pages/DailyReports';
import { SoftwareInventory } from '../pages/SoftwareInventory';
import { SimulatorPage } from '../pages/SimulatorPage';
import { SettingsPage } from '../pages/SettingsPage';
import { Labs } from '../pages/Labs';
import { Login } from '../pages/Login';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/labs" element={<ProtectedRoute><Labs /></ProtectedRoute>} />
      <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
      <Route path="/processes" element={<ProtectedRoute><Processes /></ProtectedRoute>} />
      <Route path="/cpu-analyzer" element={<ProtectedRoute><CPUAnalyzer /></ProtectedRoute>} />
      <Route path="/memory-analyzer" element={<ProtectedRoute><MemoryAnalyzer /></ProtectedRoute>} />
      <Route path="/controller" element={<ProtectedRoute><ProcessController /></ProtectedRoute>} />
      <Route path="/deadlock" element={<ProtectedRoute><Deadlock /></ProtectedRoute>} />
      <Route path="/bankers" element={<ProtectedRoute><BankersAlgorithm /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/reports/:id" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/daily-reports" element={<ProtectedRoute><DailyReports /></ProtectedRoute>} />
      <Route path="/software" element={<ProtectedRoute><SoftwareInventory /></ProtectedRoute>} />
      <Route path="/simulator" element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
