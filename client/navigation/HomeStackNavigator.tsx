import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import ArticleDetailScreen from "@/screens/ArticleDetailScreen";
import StaffListScreen from "@/screens/StaffListScreen";
import AllStaffScreen from "@/screens/AllStaffScreen";
import StaffDetailScreen from "@/screens/StaffDetailScreen";
import CommentsScreen from "@/screens/CommentsScreen";
import {
  PoliciesScreen,
  ContactUsScreen,
  CorrectionsScreen,
  ArchivesScreen,
  AdvertisingScreen,
  SponsorScreen,
  SubmitScreen,
  GeneralInfoScreen,
  SponsorshipsScreen,
} from "@/screens/WordPressPageScreen";
import { AboutScreen } from "@/screens/AboutScreen";
import SearchScreen from "@/screens/SearchScreen";
import ArchiveArticleDetailScreen from "@/screens/ArchiveArticleDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Article, StaffProfile, HomeStackParamList } from "@/types/article";

export type { Article, StaffProfile, HomeStackParamList };
export { getArticleAuthors } from "@/types/article";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
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
      <Stack.Screen
        name="Staff"
        component={StaffListScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Staff" />,
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="AllStaff"
        component={AllStaffScreen}
        options={{
          headerTitle: () => <HeaderTitle title="All Staff" />,
          headerBackTitle: "Back",
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
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerTitle: "Search",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="ArchiveArticleDetail"
        component={ArchiveArticleDetailScreen}
        options={{
          headerTitle: "Archive",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          headerTitle: "Comments",
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
      <Stack.Screen
        name="Corrections"
        component={CorrectionsScreen}
        options={{
          headerTitle: "Corrections",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Archives"
        component={ArchivesScreen}
        options={{
          headerTitle: "Archives",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Advertising"
        component={AdvertisingScreen}
        options={{
          headerTitle: "Advertising",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Sponsor"
        component={SponsorScreen}
        options={{
          headerTitle: "Sponsor",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Submit"
        component={SubmitScreen}
        options={{
          headerTitle: "Submit",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="GeneralInfo"
        component={GeneralInfoScreen}
        options={{
          headerTitle: "General Info",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Sponsorships"
        component={SponsorshipsScreen}
        options={{
          headerTitle: "Sponsorships",
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}
