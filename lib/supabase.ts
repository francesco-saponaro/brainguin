import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// 1. SETUP YOUR SECRETS (Ideally use .env files, but for now hardcode or use process.env)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-project-id.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

// 2. CREATE CLIENT WITH PERSISTENCE
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // Keeps user logged in on mobile
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});
