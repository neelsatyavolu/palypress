import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Publication,
  PUBLICATIONS,
  DEFAULT_PUBLICATION,
  HOME_PUBLICATION,
} from "@/constants/publications";
import {
  updateCurrentYearIds,
  getCurrentYearId,
} from "@/lib/fetchCurrentYearIds";

const STORAGE_KEY = "@paly_journalism/selected_publication";

interface PublicationContextType {
  publication: Publication;
  setPublication: (publication: Publication) => void;
  publications: Publication[];
  isLoading: boolean;
  isHomeSelected: boolean;
  getCurrentYearIdForPublication: (publicationId: string) => number;
}

const PublicationContext = createContext<PublicationContextType | undefined>(
  undefined,
);

export function PublicationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [publication, setPublicationState] =
    useState<Publication>(HOME_PUBLICATION);
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicYearIds, setDynamicYearIds] = useState<Map<string, number>>(
    new Map(),
  );

  // Load saved publication and fetch current year IDs on mount
  useEffect(() => {
    const loadSavedPublication = async () => {
      try {
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedId) {
          // Check if it's the home publication
          if (savedId === "home") {
            setPublicationState(HOME_PUBLICATION);
          } else {
            const found = PUBLICATIONS.find((p) => p.id === savedId);
            if (found) {
              setPublicationState(found);
            }
          }
        }
        // If no saved ID, default to HOME_PUBLICATION (already set in initial state)
      } catch (error) {
        console.error("Failed to load saved publication:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchYearIds = async () => {
      const yearIds = await updateCurrentYearIds();
      setDynamicYearIds(yearIds);
    };

    loadSavedPublication();
    fetchYearIds();
  }, []);

  const setPublication = useCallback(async (newPublication: Publication) => {
    setPublicationState(newPublication);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newPublication.id);
    } catch (error) {
      console.error("Failed to save publication preference:", error);
    }
  }, []);

  const isHomeSelected = publication.id === "home";

  const getCurrentYearIdForPublication = useCallback(
    (publicationId: string) => {
      return getCurrentYearId(publicationId, dynamicYearIds);
    },
    [dynamicYearIds],
  );

  return (
    <PublicationContext.Provider
      value={{
        publication,
        setPublication,
        publications: PUBLICATIONS,
        isLoading,
        isHomeSelected,
        getCurrentYearIdForPublication,
      }}
    >
      {children}
    </PublicationContext.Provider>
  );
}

export function usePublication() {
  const context = useContext(PublicationContext);
  if (context === undefined) {
    throw new Error("usePublication must be used within a PublicationProvider");
  }
  return context;
}
