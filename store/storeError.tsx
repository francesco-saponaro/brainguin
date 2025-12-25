import { create } from "zustand";

type StoreError = {
  error: string | null;
  setError: (error: string) => void;
  clearError: () => void;
};

const useStoreError = create<StoreError>((set) => ({
  error: null,
  setError: (error) => set(() => ({ error: error })),
  clearError: () => set(() => ({ error: null })),
}));

export default useStoreError;
