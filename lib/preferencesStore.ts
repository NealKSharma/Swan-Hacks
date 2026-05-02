import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_PREFERENCES, UserPreferences } from "@/types";

const KEY = "cysense.preferences.v1";

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function update(next: Partial<UserPreferences>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      // best-effort; preferences still live in memory
    }
  }

  return { prefs, update, loaded };
}
