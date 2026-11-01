import React, { createContext, useContext, useCallback } from "react";
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

const SCROLL_THRESHOLD = 80;

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

interface TabBarScrollContextType {
  scrollY: ReturnType<typeof useSharedValue<number>>;
  lastScrollY: ReturnType<typeof useSharedValue<number>>;
  scrollDirection: ReturnType<typeof useSharedValue<"up" | "down" | "neutral">>;
  isScrolling: ReturnType<typeof useSharedValue<boolean>>;
  isMinimized: ReturnType<typeof useSharedValue<boolean>>;
  tabBarProgress: ReturnType<typeof useSharedValue<number>>;
  resetTabBar: () => void;
}

const TabBarScrollContext = createContext<TabBarScrollContextType | undefined>(
  undefined,
);

export function TabBarScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Scroll state tracking
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollDirection = useSharedValue<"up" | "down" | "neutral">("neutral");
  const isScrolling = useSharedValue(false);
  const isMinimized = useSharedValue(false);
  const tabBarProgress = useSharedValue(0); // 0 = full, 1 = minimized

  // Derived value to determine scroll direction
  useDerivedValue(() => {
    const diff = scrollY.value - lastScrollY.value;
    if (Math.abs(diff) < 5) {
      scrollDirection.value = "neutral";
    } else {
      scrollDirection.value = diff > 0 ? "down" : "up";
    }
    lastScrollY.value = scrollY.value;
  });

  // Derived value to control tab bar minimization
  // Minimizes when scrolling in either direction, restores when stopped or near top
  useDerivedValue(() => {
    const shouldMinimize =
      scrollY.value > SCROLL_THRESHOLD &&
      scrollDirection.value !== "neutral" &&
      isScrolling.value;

    const shouldRestore =
      scrollY.value < SCROLL_THRESHOLD || !isScrolling.value;

    if (shouldMinimize && !isMinimized.value) {
      isMinimized.value = true;
      tabBarProgress.value = withSpring(1, springConfig);
    } else if (shouldRestore && isMinimized.value) {
      isMinimized.value = false;
      tabBarProgress.value = withSpring(0, springConfig);
    }
  });

  const resetTabBar = useCallback(() => {
    "worklet";
    scrollY.value = 0;
    lastScrollY.value = 0;
    scrollDirection.value = "neutral";
    isScrolling.value = false;
    isMinimized.value = false;
    tabBarProgress.value = withSpring(0, springConfig);
  }, []);

  return (
    <TabBarScrollContext.Provider
      value={{
        scrollY,
        lastScrollY,
        scrollDirection,
        isScrolling,
        isMinimized,
        tabBarProgress,
        resetTabBar,
      }}
    >
      {children}
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarScrollContext() {
  const context = useContext(TabBarScrollContext);
  if (context === undefined) {
    throw new Error(
      "useTabBarScrollContext must be used within a TabBarScrollProvider",
    );
  }
  return context;
}
