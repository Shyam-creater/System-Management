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
import { SoftwareInventory } from '../pages/SoftwareInventory';
import { SimulatorPage } from '../pages/SimulatorPage';
import { SettingsPage } from '../pages/SettingsPage';
import { Labs } from '../pages/Labs';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/labs" element={<Labs />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/processes" element={<Processes />} />
      <Route path="/cpu-analyzer" element={<CPUAnalyzer />} />
      <Route path="/memory-analyzer" element={<MemoryAnalyzer />} />
      <Route path="/controller" element={<ProcessController />} />
      <Route path="/deadlock" element={<Deadlock />} />
      <Route path="/bankers" element={<BankersAlgorithm />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/software" element={<SoftwareInventory />} />
      <Route path="/simulator" element={<SimulatorPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
