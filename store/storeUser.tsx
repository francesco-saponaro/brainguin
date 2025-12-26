import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  signOut: () => set({ session: null, user: null }),
}));
