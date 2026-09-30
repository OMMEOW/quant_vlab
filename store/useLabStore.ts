import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LabState {
  dataset: any[] | null;
  headers: string[];
  cleanedData: any[] | null;
  selectedColumns: string[];
  moduleResults: Record<string, any>;
  currentStep: number;

  setDataset: (data: any[], headers: string[]) => void;
  setSelectedColumns: (columns: string[]) => void;
  updateResults: (moduleId: string, results: any) => void;
  resetLab: () => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set) => ({
      dataset: null,
      headers: [],
      cleanedData: null,
      selectedColumns: [],
      moduleResults: {},
      currentStep: 0,

      setDataset: (dataset, headers) => set({ dataset, headers, cleanedData: dataset, selectedColumns: headers }),
      setSelectedColumns: (selectedColumns) => set({ selectedColumns }),
      updateResults: (moduleId, results) =>
        set((state) => ({
          moduleResults: { ...state.moduleResults, [moduleId]: results }
        })),
      resetLab: () => {
        set({
          dataset: null,
          headers: [],
          cleanedData: null,
          selectedColumns: [],
          moduleResults: {},
          currentStep: 0
        });
        localStorage.removeItem('lab-storage');
      },
    }),
    {
      name: 'lab-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        headers: state.headers,
        selectedColumns: state.selectedColumns,
        moduleResults: state.moduleResults,
        currentStep: state.currentStep,
      }),
    }
  )
);
