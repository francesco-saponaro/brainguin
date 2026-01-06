import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// 1. SETUP YOUR SECRETS (Ideally use .env files, but for now hardcode or use process.env)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
console.log(SUPABASE_URL, "SUPABASE URL");
console.log(SUPABASE_ANON_KEY, "SUPABASE ANIB KEY");

// 💡 FIX: Determine the storage engine based on the environment
// 1. If Native (iOS/Android), use AsyncStorage.
// 2. If Web + Browser, use AsyncStorage (which uses localStorage).
// 3. If Web + Server (SSR/Node), use a dummy null storage to prevent crashes.
const isBrowser = typeof window !== "undefined";

const storageEngine =
  Platform.OS === "web" ? (isBrowser ? AsyncStorage : undefined) : AsyncStorage;

// 2. CREATE CLIENT WITH PERSISTENCE
export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    storage: storageEngine,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web", // Important for React Native
  },
});
