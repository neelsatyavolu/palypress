import * as Haptics from "expo-haptics";

/**
 * Haptic feedback utilities for consistent tactile responses throughout the app
 */

export const haptics = {
  /**
   * Light impact - for subtle interactions like tab selection, button presses
   */
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Silently fail if haptics are not available
    });
  },

  /**
   * Medium impact - for standard interactions like bookmark, upvote
   */
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  /**
   * Heavy impact - for significant actions like delete, submit
   */
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  /**
   * Success feedback - for successful operations
   */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },

  /**
   * Warning feedback - for warning states
   */
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
  },

  /**
   * Error feedback - for errors
   */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    );
  },

  /**
   * Selection feedback - for selection changes (like picker, slider)
   */
  selection: () => {
    Haptics.selectionAsync().catch(() => {});
  },
};
