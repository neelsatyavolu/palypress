import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MapScreen from "@/screens/MapScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type MapStackParamList = {
  Map: undefined;
  RoomDetail: { roomId: string; roomName: string };
  Navigation: { from: string; to: string };
};

const Stack = createNativeStackNavigator<MapStackParamList>();

export default function MapStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerTitle: "Campus Map",
        }}
      />
    </Stack.Navigator>
  );
}
