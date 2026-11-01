import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CivicScreen from "@/screens/CivicScreen";
import ArticleDetailScreen from "@/screens/ArticleDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import type { HomeStackParamList } from "@/types/article";

export type CivicStackParamList = {
  Civic: undefined;
  ArticleDetail: HomeStackParamList["ArticleDetail"];
};

const Stack = createNativeStackNavigator<CivicStackParamList>();

export default function CivicStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Civic"
        component={CivicScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{
          headerTitle: "Article",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}
