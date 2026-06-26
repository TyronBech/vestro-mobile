import { create } from "zustand";

export type ToastType = "success" | "error" | "warning";

interface ToastState {
  message: string | null;
  type: ToastType | null;
  isVisible: boolean;
  show: (message: string, type: ToastType, duration?: number) => void;
  hide: () => void;
}

let timeoutId: any = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: null,
  isVisible: false,
  show: (message, type, duration = 3000) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    set({ message, type, isVisible: true });
    
    timeoutId = setTimeout(() => {
      set({ isVisible: false, message: null, type: null });
    }, duration);
  },
  hide: () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    set({ isVisible: false, message: null, type: null });
  }
}));
