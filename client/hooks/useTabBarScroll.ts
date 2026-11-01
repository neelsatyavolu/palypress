import { useAnimatedScrollHandler } from "react-native-reanimated";
import { useTabBarScrollContext } from "@/contexts/TabBarScrollContext";

export function useTabBarScroll() {
  const context = useTabBarScrollContext();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      context.scrollY.value = event.contentOffset.y;
      context.isScrolling.value = true;
    },
    onEndDrag: () => {
      "worklet";
      context.isScrolling.value = false;
    },
    onMomentumEnd: () => {
      "worklet";
      context.isScrolling.value = false;
    },
  });

  return {
    onScroll,
    scrollEventThrottle: 16, // 60fps
  };
}
