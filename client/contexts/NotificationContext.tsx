import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import {
  registerForPushNotificationsAsync,
  type PushRegistrationResult,
} from "@/lib/pushNotifications";
import { trackNotificationPreferenceUpdated } from "@/lib/analytics";

interface NotificationPreference {
  id: string;
  userId: string;
  publicationId: string;
  enabled: boolean;
  categoryIds: number[] | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  preferences: Record<string, NotificationPreference>;
  isLoading: boolean;
  pushRegistrationStatus: PushRegistrationResult["status"] | null;
  updatePreference: (
    publicationId: string,
    enabled: boolean,
    categoryIds?: number[] | null,
  ) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  weeklyDigestEnabled: boolean;
  updateWeeklyDigestPreference: (enabled: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [preferences, setPreferences] = useState<
    Record<string, NotificationPreference>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [pushRegistrationStatus, setPushRegistrationStatus] = useState<
    PushRegistrationResult["status"] | null
  >(null);

  const ensurePushRegistration = useCallback(async () => {
    const result = await registerForPushNotificationsAsync();
    setPushRegistrationStatus(result.status);
    return result;
  }, []);

  // Refresh preferences
  const refreshPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setPreferences({});
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        new URL("/api/notifications/preferences", getApiUrl()).toString(),
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        const nextPreferences = (data.preferences || {}) as Record<
          string,
          NotificationPreference
        >;
        setPreferences(nextPreferences);

        if (
          Object.values(nextPreferences).some(
            (preference) => preference.enabled,
          )
        ) {
          ensurePushRegistration().catch((error) => {
            console.warn("Failed to register for push notifications:", error);
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [ensurePushRegistration, isAuthenticated]);

  // Update preference
  const updatePreference = useCallback(
    async (
      publicationId: string,
      enabled: boolean,
      categoryIds?: number[] | null,
    ) => {
      if (!isAuthenticated) return;

      try {
        if (enabled) {
          const registration = await ensurePushRegistration();
          if (registration.status !== "registered") {
            throw new Error(registration.error || "Push registration failed");
          }
        }

        const response = await apiRequest(
          "PUT",
          "/api/notifications/preferences",
          {
            publicationId,
            enabled,
            categoryIds: categoryIds ?? null,
          },
        );

        if (response.ok) {
          const data = await response.json();
          setPreferences((prev) => ({
            ...prev,
            [publicationId]: data.preference,
          }));
          trackNotificationPreferenceUpdated({
            publicationId,
            enabled,
            categoryCount: categoryIds?.length ?? 0,
          });
        } else {
          throw new Error("Failed to update preference");
        }
      } catch (error) {
        console.warn("Failed to update notification preference:", error);
        throw error;
      }
    },
    [ensurePushRegistration, isAuthenticated],
  );

  // Update weekly digest email preference
  const updateWeeklyDigestPreference = useCallback(
    async (enabled: boolean) => {
      if (!isAuthenticated) return;

      const response = await apiRequest(
        "PUT",
        "/api/notifications/weekly-digest",
        { enabled },
      );

      if (!response.ok) {
        throw new Error("Failed to update weekly digest preference");
      }

      await refreshUser();
    },
    [isAuthenticated, refreshUser],
  );

  // Fetch preferences and unread count on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshPreferences();
    } else {
      setPreferences({});
      setPushRegistrationStatus(null);
    }
  }, [isAuthenticated, refreshPreferences]);

  return (
    <NotificationContext.Provider
      value={{
        preferences,
        isLoading,
        pushRegistrationStatus,
        updatePreference,
        refreshPreferences,
        weeklyDigestEnabled: user?.weeklyDigestEnabled ?? true,
        updateWeeklyDigestPreference,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
