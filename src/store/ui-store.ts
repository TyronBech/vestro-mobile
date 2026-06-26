import { create } from "zustand";

interface UIState {
  isBudgetModalOpen: boolean;
  openBudgetModal: () => void;
  closeBudgetModal: () => void;
  
  // Counter to trigger data refreshes across screens when budget config updates
  budgetUpdateTrigger: number;
  triggerBudgetUpdate: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBudgetModalOpen: false,
  openBudgetModal: () => set({ isBudgetModalOpen: true }),
  closeBudgetModal: () => set({ isBudgetModalOpen: false }),
  
  budgetUpdateTrigger: 0,
  triggerBudgetUpdate: () => set((state) => ({ budgetUpdateTrigger: state.budgetUpdateTrigger + 1 })),
}));
