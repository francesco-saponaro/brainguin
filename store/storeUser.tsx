import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { create } from "zustand";

type InputType = "pdf" | "url" | "topic";

interface AuthState {
  session: Session | null;
  isOnboarded: boolean;
  setSession: (session: Session | null, isOnboarded?: boolean) => void;
  signOut: () => Promise<void>;
  isCreationModalOpen: boolean;
  creationInitialType: InputType;
  openCreationModal: (type?: InputType) => void;
  closeCreationModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isOnboarded: false,
  setSession: (session, isOnboarded = false) => set({ session, isOnboarded }),
  signOut: async () => {
    set({ session: null, isOnboarded: false });
    await supabase.auth.signOut();
  },
  isCreationModalOpen: false,
  creationInitialType: "pdf",
  openCreationModal: (type = "pdf") =>
    set({ isCreationModalOpen: true, creationInitialType: type }),

  closeCreationModal: () => set({ isCreationModalOpen: false }),
}));
