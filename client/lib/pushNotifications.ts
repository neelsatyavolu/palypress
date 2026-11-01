import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { apiRequest } from "@/lib/query-client";
import { trackNotificationPermission } from "@/lib/analytics";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushRegistrationResult =
  | { status: "registered"; token: string }
  | { status: "denied" | "skipped" | "error"; error?: string };

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    trackNotificationPermission({
      status: "skipped",
      platform: Platform.OS,
      reason: "web",
    });
    return { status: "skipped" };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ffffff",
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    trackNotificationPermission({
      status: "denied",
      platform: Platform.OS,
      reason: "permission_denied",
    });
    return { status: "denied", error: "Push notification permission denied" };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    trackNotificationPermission({
      status: "error",
      platform: Platform.OS,
      reason: "missing_project_id",
    });
    return { status: "error", error: "Expo project ID is not configured" };
  }

  let token: string;
  try {
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
  } catch (error) {
    trackNotificationPermission({
      status: "error",
      platform: Platform.OS,
      reason: "token_registration_failed",
    });
    throw error;
  }

  await apiRequest("PUT", "/api/notifications/push-token", {
    token,
    platform: Platform.OS,
  });

  trackNotificationPermission({
    status: "registered",
    platform: Platform.OS,
  });

  return { status: "registered", token };
}
