import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import CivicStackNavigator from "@/navigation/CivicStackNavigator";
import PublicationsStackNavigator from "@/navigation/PublicationsStackNavigator";
import CalendarStackNavigator from "@/navigation/CalendarStackNavigator";
import ScheduleStackNavigator from "@/navigation/ScheduleStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import type { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import type { CivicStackParamList } from "@/navigation/CivicStackNavigator";
import type { PublicationsStackParamList } from "@/navigation/PublicationsStackNavigator";
import type { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";
import type { ScheduleStackParamList } from "@/navigation/ScheduleStackNavigator";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import {
  TabBarScrollProvider,
  useTabBarScrollContext,
} from "@/contexts/TabBarScrollContext";
import { AnimatedTabBar } from "@/components/AnimatedTabBar";
import { FEATURES } from "@/config/features";

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  NewsTab: NavigatorScreenParams<HomeStackParamList>;
  PublicationsTab: NavigatorScreenParams<PublicationsStackParamList>;
  CivicTab: NavigatorScreenParams<CivicStackParamList>;
  CalendarTab: NavigatorScreenParams<CalendarStackParamList>;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  SettingsTab: NavigatorScreenParams<ProfileStackParamList>;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigatorContent() {
  const { resetTabBar } = useTabBarScrollContext();

  return (
    <Tab.Navigator
      initialRouteName="NewsTab"
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      screenListeners={{
        tabPress: () => {
          resetTabBar();
        },
      }}
    >
      {FEATURES.dashboard && (
        <Tab.Screen
          name="DashboardTab"
          component={DashboardStackNavigator}
          options={{
            title: "Dashboard",
          }}
        />
      )}
      <Tab.Screen
        name="NewsTab"
        component={HomeStackNavigator}
        options={{
          title: "Home",
        }}
      />
      <Tab.Screen
        name="PublicationsTab"
        component={PublicationsStackNavigator}
        options={{
          title: "Pubs",
        }}
      />
      <Tab.Screen
        name="CivicTab"
        component={CivicStackNavigator}
        options={{
          title: "Local",
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStackNavigator}
        options={{
          title: "Calendar",
        }}
      />
      {FEATURES.schedule && (
        <Tab.Screen
          name="ScheduleTab"
          component={ScheduleStackNavigator}
          options={{
            title: "Schedule",
          }}
        />
      )}
      <Tab.Screen
        name="SettingsTab"
        component={ProfileStackNavigator}
        options={{
          title: "Settings",
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <TabBarScrollProvider>
      <MainTabNavigatorContent />
    </TabBarScrollProvider>
  );
}
