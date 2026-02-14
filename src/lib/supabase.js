import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-url-polyfill/auto";

// TODO: Replace with your Supabase project URL and anon key
// Get these from: https://app.supabase.com → Settings → API
const SUPABASE_URL = "https://ajjndjepuhqifzpewsyi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqam5kamVwdWhxaWZ6cGV3c3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzE5MjEsImV4cCI6MjA4NDcwNzkyMX0.w8Dln9fcBNzjI8_qw2AGIKLQvaiXa0RofnUPFGiXp3E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
