import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalendarScreen from "@/screens/CalendarScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CalendarStackParamList = {
  Calendar: undefined;
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export default function CalendarStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          headerTitle: "Calendar",
        }}
      />
    </Stack.Navigator>
  );
}
