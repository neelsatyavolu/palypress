import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_READER_PREFERENCES,
  normalizeReaderPreferences,
  type AppFontFamily,
  type FontFamily,
  type LineSpacing,
  type ReaderPreferences,
} from "@/lib/appearancePreferences";

export type {
  AppFontFamily,
  FontFamily,
  LineSpacing,
  ReaderPreferences,
} from "@/lib/appearancePreferences";

interface ReaderPreferencesContextValue {
  preferences: ReaderPreferences;
  setFontSize: (size: number) => void;
  setFontFamily: (family: FontFamily) => void;
  setLineSpacing: (spacing: LineSpacing) => void;
  setAppFontFamily: (family: AppFontFamily) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = "@reader_preferences";

const ReaderPreferencesContext = createContext<
  ReaderPreferencesContextValue | undefined
>(undefined);

export function ReaderPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<ReaderPreferences>(
    DEFAULT_READER_PREFERENCES,
  );
  const [loaded, setLoaded] = useState(false);

  // Load preferences from storage on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Save preferences to storage whenever they change
  useEffect(() => {
    if (loaded) {
      savePreferences();
    }
  }, [preferences, loaded]);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(normalizeReaderPreferences(parsed));
      }
    } catch (error) {
      console.error("Failed to load reader preferences:", error);
    } finally {
      setLoaded(true);
    }
  };

  const savePreferences = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save reader preferences:", error);
    }
  };

  const setFontSize = (size: number) => {
    const clampedSize = Math.max(14, Math.min(22, size));
    setPreferences((prev) => ({ ...prev, fontSize: clampedSize }));
  };

  const setFontFamily = (family: FontFamily) => {
    setPreferences((prev) => ({ ...prev, fontFamily: family }));
  };

  const setLineSpacing = (spacing: LineSpacing) => {
    setPreferences((prev) => ({ ...prev, lineSpacing: spacing }));
  };

  const setAppFontFamily = (family: AppFontFamily) => {
    setPreferences((prev) => ({ ...prev, appFontFamily: family }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_READER_PREFERENCES);
  };

  return (
    <ReaderPreferencesContext.Provider
      value={{
        preferences,
        setFontSize,
        setFontFamily,
        setLineSpacing,
        setAppFontFamily,
        resetPreferences,
      }}
    >
      {children}
    </ReaderPreferencesContext.Provider>
  );
}

export function useReaderPreferences(): ReaderPreferencesContextValue {
  const context = useContext(ReaderPreferencesContext);
  if (!context) {
    throw new Error(
      "useReaderPreferences must be used within ReaderPreferencesProvider",
    );
  }
  return context;
}

export function useOptionalReaderPreferences():
  | ReaderPreferencesContextValue
  | undefined {
  return useContext(ReaderPreferencesContext);
}
