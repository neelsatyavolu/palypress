import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DirectoryScreen from "@/screens/DirectoryScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type DirectoryStackParamList = {
  Directory: undefined;
  StaffDetail: { staffId: string; email: string };
};

const Stack = createNativeStackNavigator<DirectoryStackParamList>();

export default function DirectoryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Directory"
        component={DirectoryScreen}
        options={{
          headerTitle: "Staff Directory",
        }}
      />
    </Stack.Navigator>
  );
}
