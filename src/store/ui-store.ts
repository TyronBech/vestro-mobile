import { create } from "zustand";
import { CoreNetwork, CreditCard } from "../types";

interface UIState {
  isBudgetModalOpen: boolean;
  openBudgetModal: () => void;
  closeBudgetModal: () => void;
  
  isMacroAssetModalOpen: boolean;
  openMacroAssetModal: () => void;
  closeMacroAssetModal: () => void;
  
  isCoreNetworkModalOpen: boolean;
  editingCoreNetwork: CoreNetwork | null;
  openCoreNetworkModal: (node?: CoreNetwork | null) => void;
  closeCoreNetworkModal: () => void;

  isSweepModalOpen: boolean;
  openSweepModal: () => void;
  closeSweepModal: () => void;

  isCashFlowModalOpen: boolean;
  openCashFlowModal: () => void;
  closeCashFlowModal: () => void;
  
  isCreditCardModalOpen: boolean;
  editingCreditCard: CreditCard | null;
  openCreditCardModal: (card?: CreditCard | null) => void;
  closeCreditCardModal: () => void;
  
  // Counter to trigger data refreshes across screens when budget config updates
  budgetUpdateTrigger: number;
  triggerBudgetUpdate: () => void;

  // Counter to trigger data refreshes when networks or macro assets update
  networkUpdateTrigger: number;
  triggerNetworkUpdate: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBudgetModalOpen: false,
  openBudgetModal: () => set({ isBudgetModalOpen: true }),
  closeBudgetModal: () => set({ isBudgetModalOpen: false }),
  
  isMacroAssetModalOpen: false,
  openMacroAssetModal: () => set({ isMacroAssetModalOpen: true }),
  closeMacroAssetModal: () => set({ isMacroAssetModalOpen: false }),
  
  isCoreNetworkModalOpen: false,
  editingCoreNetwork: null,
  openCoreNetworkModal: (node = null) => set({ isCoreNetworkModalOpen: true, editingCoreNetwork: node }),
  closeCoreNetworkModal: () => set({ isCoreNetworkModalOpen: false, editingCoreNetwork: null }),

  isSweepModalOpen: false,
  openSweepModal: () => set({ isSweepModalOpen: true }),
  closeSweepModal: () => set({ isSweepModalOpen: false }),

  isCashFlowModalOpen: false,
  openCashFlowModal: () => set({ isCashFlowModalOpen: true }),
  closeCashFlowModal: () => set({ isCashFlowModalOpen: false }),
  
  isCreditCardModalOpen: false,
  editingCreditCard: null,
  openCreditCardModal: (card = null) => set({ isCreditCardModalOpen: true, editingCreditCard: card }),
  closeCreditCardModal: () => set({ isCreditCardModalOpen: false, editingCreditCard: null }),
  
  budgetUpdateTrigger: 0,
  triggerBudgetUpdate: () => set((state) => ({ budgetUpdateTrigger: state.budgetUpdateTrigger + 1 })),

  networkUpdateTrigger: 0,
  triggerNetworkUpdate: () => set((state) => ({ networkUpdateTrigger: state.networkUpdateTrigger + 1 })),
}));
