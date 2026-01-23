import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  session: Session | null;
  isOnboarded: boolean;
  setSession: (session: Session | null, isOnboarded?: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isOnboarded: false,
  setSession: (session, isOnboarded = false) => set({ session, isOnboarded }),
  signOut: async () => {
    set({ session: null, isOnboarded: false });
    await supabase.auth.signOut();
  },
}));
