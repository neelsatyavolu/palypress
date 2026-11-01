import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import SignInScreen from "@/screens/SignInScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import SavedArticlesScreen from "@/screens/SavedArticlesScreen";
import ArticleDetailScreen from "@/screens/ArticleDetailScreen";
import MyCommentsScreen from "@/screens/MyCommentsScreen";
import AppearanceSettingsScreen from "@/screens/AppearanceSettingsScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import NotificationCategoriesScreen from "@/screens/NotificationCategoriesScreen";
import SecuritySettingsScreen from "@/screens/SecuritySettingsScreen";
import LegalScreen from "@/screens/LegalScreen";
import BlockedUsersScreen from "@/screens/BlockedUsersScreen";
import { useTheme } from "@/hooks/useTheme";
import type { Article } from "@/types/article";

export type ProfileStackParamList = {
  SignIn: undefined;
  Profile: undefined;
  SavedArticles: undefined;
  SavedArticleDetail: { article: Article };
  MyComments: undefined;
  AppearanceSettings: undefined;
  NotificationSettings: undefined;
  NotificationCategories: { publicationId: string };
  SecuritySettings: undefined;
  BlockedUsers: undefined;
  Legal: { document: "terms" | "privacy" };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={isDark ? "#999" : "#666"} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerTitle: "Profile" }}
          />
          <Stack.Screen
            name="SavedArticles"
            component={SavedArticlesScreen}
            options={{ headerTitle: "Saved Articles" }}
          />
          <Stack.Screen
            name="SavedArticleDetail"
            component={ArticleDetailScreen}
            options={{ headerTitle: "Article", headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="MyComments"
            component={MyCommentsScreen}
            options={{ headerTitle: "My Comments" }}
          />
          <Stack.Screen
            name="AppearanceSettings"
            component={AppearanceSettingsScreen}
            options={{ headerTitle: "Appearance" }}
          />
          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
            options={{ headerTitle: "Notification Preferences" }}
          />
          <Stack.Screen
            name="NotificationCategories"
            component={NotificationCategoriesScreen}
            options={{ headerTitle: "Select Categories" }}
          />
          <Stack.Screen
            name="SecuritySettings"
            component={SecuritySettingsScreen}
            options={{ headerTitle: "Security" }}
          />
          <Stack.Screen
            name="BlockedUsers"
            component={BlockedUsersScreen}
            options={{ headerTitle: "Blocked Users" }}
          />
        </>
      ) : (
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerTitle: "Sign In" }}
        />
      )}
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }) => ({
          headerTitle:
            route.params.document === "terms"
              ? "Terms of Service"
              : "Privacy Policy",
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
