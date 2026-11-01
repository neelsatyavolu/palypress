import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { TamaguiProvider } from "tamagui";

import {
  EffectiveColorScheme,
  normalizeThemeMode,
  resolveEffectiveColorScheme,
  ThemeMode,
} from "@/lib/themeMode";
import config from "../../tamagui.config";

interface ThemeModeContextValue {
  mode: ThemeMode;
  colorScheme: EffectiveColorScheme;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "@theme_mode";

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMode();
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, mode).catch((error) => {
        console.error("Failed to save theme mode:", error);
      });
    }
  }, [loaded, mode]);

  const loadMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      setModeState(normalizeThemeMode(stored));
    } catch (error) {
      console.error("Failed to load theme mode:", error);
    } finally {
      setLoaded(true);
    }
  };

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const colorScheme = resolveEffectiveColorScheme(mode, systemColorScheme);

  const value = useMemo(
    () => ({ mode, colorScheme, setMode }),
    [colorScheme, mode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <TamaguiProvider config={config} defaultTheme={colorScheme}>
        {children}
      </TamaguiProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return context;
}
