import { create } from 'zustand';
import { NodeInfo } from '../types';

interface FleetState {
  selectedNode: NodeInfo | null;
  setSelectedNode: (node: NodeInfo | null) => void;
  simulatorRunning: boolean;
  setSimulatorRunning: (running: boolean) => void;
  searchFilter: string;
  setSearchFilter: (filter: string) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),
  simulatorRunning: false,
  setSimulatorRunning: (running) => set({ simulatorRunning: running }),
  searchFilter: '',
  setSearchFilter: (filter) => set({ searchFilter: filter })
}));
