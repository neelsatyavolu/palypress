/**
 * Feature flags for temporarily hiding app sections.
 *
 * Flip a flag to `true` to restore the feature. Tabs, cards, and entry points
 * are conditionally rendered based on these values, so nothing dead-links while
 * a feature is hidden.
 *
 * Note: Calendar, To-Do, Campus Map and Staff Directory are surfaced only from
 * the Dashboard tab, so they are hidden together with `dashboard`. The `staff`
 * flag additionally controls legacy staff drawer routes.
 */
export const FEATURES = {
  dashboard: false,
  schedule: false,
  staff: false,
} as const;
