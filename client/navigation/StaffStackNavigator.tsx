import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StaffListScreen from "@/screens/StaffListScreen";
import StaffDetailScreen from "@/screens/StaffDetailScreen";
import ArticleDetailScreen from "@/screens/ArticleDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Article, StaffProfile } from "@/types/article";

export type StaffStackParamList = {
  StaffList: undefined;
  StaffDetail: { staff: StaffProfile; publicationId?: string };
  StaffArticleDetail: { article: Article };
};

const Stack = createNativeStackNavigator<StaffStackParamList>();

export default function StaffStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="StaffList"
        component={StaffListScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Staff" />,
        }}
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
