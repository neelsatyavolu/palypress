import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import {
  NavigationContainer,
  LinkingOptions,
  getPathFromState as defaultGetPathFromState,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { Feather } from "@expo/vector-icons";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { PostHogProvider } from "posthog-react-native";
import { posthogClient, trackNotificationOpened } from "@/lib/analytics";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplashScreen } from "@/components/AppSplashScreen";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";
import { getHasOnboarded, setOnboarded } from "@/lib/onboardingStorage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SavedArticlesProvider } from "@/contexts/SavedArticlesContext";
import { FollowsProvider } from "@/contexts/FollowsContext";
import { UpvoteProvider } from "@/contexts/UpvoteContext";
import { PublicationProvider } from "@/contexts/PublicationContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ReaderPreferencesProvider } from "@/contexts/ReaderPreferencesContext";
import { ThemeModeProvider } from "@/contexts/ThemeModeContext";
import { KeyboardProviderCompat } from "@/components/KeyboardProviderCompat";

SplashScreen.preventAutoHideAsync().catch(() => {});

const configuredDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
const configuredOrigin = configuredDomain
  ? `https://${configuredDomain}`
  : undefined;

const linkingPrefixes = Array.from(
  new Set(
    [
      Linking.createURL("/"),
      "palyvoice://",
      "https://palyjournalism.com",
      "https://api.palyjournalism.com",
      "https://palyjournalismapp-production.up.railway.app",
      configuredOrigin,
      configuredOrigin ? `${configuredOrigin}/app` : undefined,
    ].filter(Boolean) as string[],
  ),
);

function sanitizeRouteParams(
  params?: Record<string, unknown>,
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;

  const nextParams: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (
      key === "article" &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const articleId = (value as { id?: unknown }).id;
      if (typeof articleId === "number" || typeof articleId === "string") {
        nextParams.articleId = articleId;
      }
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      nextParams[key] = value;
    }
  }

  return Object.keys(nextParams).length > 0 ? nextParams : undefined;
}

function sanitizeStateForPath(state: any): any {
  if (!state || !Array.isArray(state.routes)) {
    return state;
  }

  return {
    ...state,
    routes: state.routes.map((route: any) => ({
      ...route,
      params: sanitizeRouteParams(route.params),
      state: route.state ? sanitizeStateForPath(route.state) : undefined,
    })),
  };
}

const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: linkingPrefixes,
  config: {
    screens: {
      Main: {
        path: "app",
        screens: {
          NewsTab: {
            screens: {
              Home: "",
              ArticleDetail: "article/:publicationId/:articleId",
            },
          },
        },
      },
    },
  },
  getPathFromState(state, options) {
    const sanitizedState = sanitizeStateForPath(state);
    return defaultGetPathFromState(sanitizedState, options);
  },
};

function AppShell() {
  const { isLoading: authLoading } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  // null while we read the persisted flag; true/false once resolved.
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    Feather.loadFont()
      .catch(() => {
        // Keep running if icon font preload fails; Expo will still try lazy loading.
      })
      .finally(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    getHasOnboarded().then(setOnboardingComplete);
  }, []);

  const handleOnboardingComplete = () => {
    setOnboarded().catch(() => {});
    setOnboardingComplete(true);
  };

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data ?? {};
        trackNotificationOpened({
          notificationId: response.notification.request.identifier,
          articleId:
            typeof data.articleId === "string" ||
            typeof data.articleId === "number"
              ? data.articleId
              : undefined,
          publicationId:
            typeof data.publicationId === "string"
              ? data.publicationId
              : undefined,
        });
      },
    );

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardProviderCompat>
          <NavigationContainer linking={linking}>
            <RootStackNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </KeyboardProviderCompat>
        {splashVisible && (
          <AppSplashScreen
            ready={fontsLoaded && !authLoading && onboardingComplete !== null}
            minDurationMs={onboardingComplete === true ? 3000 : 0}
            onFinished={() => setSplashVisible(false)}
          />
        )}
        {!splashVisible && onboardingComplete === false && (
          <OnboardingCarousel onComplete={handleOnboardingComplete} />
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PostHogProvider
        client={posthogClient ?? undefined}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ["testID"],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <ThemeModeProvider>
            <PublicationProvider>
              <AuthProvider>
                <NotificationProvider>
                  <UpvoteProvider>
                    <SavedArticlesProvider>
                      <FollowsProvider>
                        <ReaderPreferencesProvider>
                          <AppShell />
                        </ReaderPreferencesProvider>
                      </FollowsProvider>
                    </SavedArticlesProvider>
                  </UpvoteProvider>
                </NotificationProvider>
              </AuthProvider>
            </PublicationProvider>
          </ThemeModeProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
