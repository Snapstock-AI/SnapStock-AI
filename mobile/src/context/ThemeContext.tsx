import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { palettes, type ColorScheme, type ThemeColors } from '../theme';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'snapstock_theme_preference';

type ThemeContextValue = {
  /** What the user chose — 'system' means "follow the device setting". */
  preference: ThemePreference;
  /** The actual scheme in effect right now (preference resolved against the device). */
  scheme: ColorScheme;
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => void;
  /** Convenience for a simple sun/moon toggle: flips light<->dark, leaving "system" behind. */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // Keep the 'system' default if the stored preference can't be read.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const toggle = useCallback(() => {
    setPreference(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      scheme,
      colors: palettes[scheme],
      setPreference,
      toggle,
    }),
    [preference, scheme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
