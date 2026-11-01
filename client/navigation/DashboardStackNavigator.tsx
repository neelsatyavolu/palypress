import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "@/screens/DashboardScreen";
import MapScreen from "@/screens/MapScreen";
import DirectoryScreen from "@/screens/DirectoryScreen";
import StaffDirectoryScreen from "@/screens/StaffDirectoryScreen";
import SavedArticlesScreen from "@/screens/SavedArticlesScreen";
import ArticleDetailScreen from "@/screens/ArticleDetailScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import NotificationCategoriesScreen from "@/screens/NotificationCategoriesScreen";
import SearchScreen from "@/screens/SearchScreen";
import TodoListScreen from "@/screens/TodoListScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import {
  PoliciesScreen,
  ContactUsScreen,
} from "@/screens/WordPressPageScreen";
import { AboutScreen } from "@/screens/AboutScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { Article } from "@/types/article";

export type DashboardStackParamList = {
  Dashboard: undefined;
  Map: undefined;
  Directory: undefined;
  StaffDirectory: undefined;
  SavedArticles: undefined;
  SavedArticleDetail: { article: Article };
  NotificationSettings: undefined;
  NotificationCategories: { publicationId: string };
  Search: undefined;
  TodoList: undefined;
  Calendar: undefined;
  About: undefined;
  Policies: undefined;
  ContactUs: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: "Dashboard",
        }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerTitle: "Campus Map",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Directory"
        component={DirectoryScreen}
        options={{
          headerTitle: "Building Directory",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="StaffDirectory"
        component={StaffDirectoryScreen}
        options={{
          headerTitle: "Staff Directory",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="SavedArticles"
        component={SavedArticlesScreen}
        options={{
          headerTitle: "Saved Articles",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="SavedArticleDetail"
        component={ArticleDetailScreen}
        options={{
          headerTitle: "Article",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerTitle: "Notification Preferences",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="NotificationCategories"
        component={NotificationCategoriesScreen}
        options={{
          headerTitle: "Select Categories",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerTitle: "Search",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="TodoList"
        component={TodoListScreen}
        options={{
          headerTitle: "To-Do List",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          headerTitle: "Calendar",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerTitle: "About",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Policies"
        component={PoliciesScreen}
        options={{
          headerTitle: "Policies",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="ContactUs"
        component={ContactUsScreen}
        options={{
          headerTitle: "Contact Us",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}
