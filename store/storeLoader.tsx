import { create } from "zustand";

type StoreLoader = {
  loadingCount: number;
  startLoading: () => void;
  stopLoading: () => void;
  reset: () => void;
};

const useStoreLoader = create<StoreLoader>((set) => ({
  loadingCount: 0,
  startLoading: () =>
    set((state) => ({
      loadingCount: state.loadingCount + 1,
    })),
  stopLoading: () =>
    set((state) => ({
      loadingCount: Math.max(0, state.loadingCount - 1),
    })),
  reset: () => set({ loadingCount: 0 }),
}));

export default useStoreLoader;
