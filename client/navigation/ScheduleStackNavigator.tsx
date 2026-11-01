import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScheduleScreen from "@/screens/ScheduleScreen";
import AddClassScreen from "@/screens/AddClassScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ScheduleStackParamList = {
  Schedule: undefined;
  ClassDetail: { classId: string };
  AddClass: undefined;
  EditClass: { classId: string };
};

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export default function ScheduleStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          headerTitle: "Schedule",
        }}
      />
      <Stack.Screen
        name="AddClass"
        component={AddClassScreen}
        options={{
          headerTitle: "Add Class",
        }}
      />
    </Stack.Navigator>
  );
}
