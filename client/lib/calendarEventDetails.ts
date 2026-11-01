interface CalendarEventWithDetails {
  id: string;
  occurId?: string | null;
}

export function canFetchCalendarEventDetails(
  event: CalendarEventWithDetails,
): boolean {
  return Boolean(event.occurId);
}

export function getCalendarEventDetailsPath(
  event: CalendarEventWithDetails,
): string | null {
  if (!event.occurId) return null;

  return `api/paly-calendar/events/${encodeURIComponent(event.id)}/details?occurId=${encodeURIComponent(event.occurId)}`;
}
