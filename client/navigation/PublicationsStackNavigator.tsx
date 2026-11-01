import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PublicationsScreen from "@/screens/PublicationsScreen";
import StaffListScreen from "@/screens/StaffListScreen";
import StaffDetailScreen from "@/screens/StaffDetailScreen";
import ArticleDetailScreen from "@/screens/ArticleDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Article, StaffProfile } from "@/types/article";
import { Publication } from "@/constants/publications";

export type PublicationsStackParamList = {
  PublicationsList: undefined;
  Staff: { publication?: Publication } | undefined;
  StaffDetail: { staff: StaffProfile; publicationId?: string };
  StaffArticleDetail: { article: Article };
};

const Stack = createNativeStackNavigator<PublicationsStackParamList>();

export default function PublicationsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="PublicationsList"
        component={PublicationsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Staff"
        component={StaffListScreen}
        options={({ route }) => ({
          headerTitle: route.params?.publication
            ? `${route.params.publication.shortName} Staff`
            : "Staff",
          headerBackTitle: "Back",
        })}
      />
      <Stack.Screen
        name="StaffDetail"
        component={StaffDetailScreen}
        options={{
          headerTitle: "Profile",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="StaffArticleDetail"
        component={ArticleDetailScreen}
        options={{
          headerTitle: "Article",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}
