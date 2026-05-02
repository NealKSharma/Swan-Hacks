import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Defensive cleanup: strip whitespace, surrounding quotes, and trailing
// slashes from env values. `.env` files vary wildly in how they handle
// quoting; users frequently paste in URLs with a trailing slash.
function clean(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const url = clean(process.env.EXPO_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
const anonKey = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const supabasePublicUrl = url;
export const supabasePublicAnonKey = anonKey;

// Treat blank or "YOUR_..." placeholders as not configured.
function looksConfigured(value: string): boolean {
  if (!value) return false;
  if (value.toUpperCase().includes("YOUR_")) return false;
  return true;
}

// Validate the URL shape so we fail fast instead of confusing Supabase later.
function isValidSupabaseUrl(value: string): boolean {
  if (!/^https?:\/\//.test(value)) return false;
  try {
    const u = new URL(value);
    // Project URL has no path component beyond "/"; if there's a path,
    // the user probably pasted the dashboard URL or a REST endpoint.
    return u.pathname === "" || u.pathname === "/";
  } catch {
    return false;
  }
}

if (looksConfigured(url) && !isValidSupabaseUrl(url)) {
  console.warn(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL looks malformed:",
    JSON.stringify(url),
    "Expected https://YOUR-PROJECT.supabase.co with no extra path. Falling back to mock data."
  );
}

export const supabaseConfigured =
  looksConfigured(url) && looksConfigured(anonKey) && isValidSupabaseUrl(url);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (_client) return _client;
  _client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage as never,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}
