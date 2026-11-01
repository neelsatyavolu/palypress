import AsyncStorage from "@react-native-async-storage/async-storage";

// Bump the suffix if the onboarding content changes enough to warrant showing
// it again to existing users.
const ONBOARDING_KEY = "@palypress/onboarding_complete_v1";

// Returns whether the user has already completed onboarding. On any storage
// error we default to `true` (skip onboarding) so a read failure never traps a
// returning user in the intro on every launch.
export async function getHasOnboarded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch (error) {
    console.error("Failed to read onboarding flag:", error);
    return true;
  }
}

// Persists that onboarding is complete. Errors are logged but swallowed — the
// caller should dismiss the carousel regardless; the worst case is the intro
// reappears next launch.
export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch (error) {
    console.error("Failed to persist onboarding flag:", error);
  }
}
