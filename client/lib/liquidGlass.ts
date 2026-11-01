import { Platform } from "react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";

export function isLiquidGlassEnabled() {
  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}
