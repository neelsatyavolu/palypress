import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getCalendarEventDetailsPath } from "@/lib/calendarEventDetails";
import { getApiUrl } from "@/lib/config";

interface PalyCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  source: "paly";
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  date: string;
  occurId: string | null;
}

interface PalyCalendarEventDetails {
  title: string;
  date: string | null;
  time: string | null;
  calendarName: string;
  calendarColor: string;
  location: string | null;
  description: string[];
}

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const PALY_GREEN = "#006931";
const PALY_GOLD = "#C6A15B";

export default function CalendarScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark, theme } = useTheme();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState<PalyCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<PalyCalendarEvent | null>(null);
  const [selectedEventDetails, setSelectedEventDetails] =
    useState<PalyCalendarEventDetails | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailAnimation = useRef(new Animated.Value(0)).current;

  const selectedDayKey = toDateKey(selectedDate);
  const selectedMonthKey = getMonthKey(selectedDate);
  const surfaceColor = isDark ? "rgba(255,255,255,0.07)" : "#FFFFFF";
  const detailSheetColor = isDark ? theme.backgroundDefault : "#FFFFFF";
  const mutedSurfaceColor = isDark ? "rgba(255,255,255,0.045)" : "#F6F4EF";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const mutedTextColor = isDark ? "rgba(255,255,255,0.66)" : "#625F58";
  const detailSheetTranslateY = detailAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const fetchEvents = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const { timeMin, timeMax } = getMonthRange(selectedMonthKey);
        const url = `${getApiUrl()}api/paly-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error("Error fetching PALY calendar events:", err);
        setError("Calendar unavailable");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedMonthKey],
  );

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );
  useEffect(() => {
    if (!selectedEvent) {
      detailAnimation.setValue(0);
      return;
    }

    detailAnimation.setValue(0);
    Animated.timing(detailAnimation, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [detailAnimation, selectedEvent]);

  const calendarDays = useMemo(
    () => getCalendarDays(selectedDate),
    [selectedDate],
  );
  const eventsForSelectedDay = useMemo(
    () =>
      events
        .filter((event) => getEventDateKey(event) === selectedDayKey)
        .sort(compareEvents),
    [events, selectedDayKey],
  );

  const goToToday = () => setSelectedDate(new Date());
  const moveMonth = (delta: number) => {
    setSelectedDate((current) => {
      const target = new Date(
        current.getFullYear(),
        current.getMonth() + delta,
        1,
      );
      const maxDay = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
      ).getDate();
      target.setDate(Math.min(current.getDate(), maxDay));
      return target;
    });
  };
  const moveDay = (delta: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };
  const closeEventDetails = useCallback(() => {
    setSelectedEvent(null);
    setSelectedEventDetails(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }, []);
  const openEventDetails = useCallback(async (event: PalyCalendarEvent) => {
    setSelectedEvent(event);
    setSelectedEventDetails(null);
    setDetailError(null);

    const detailsPath = getCalendarEventDetailsPath(event);
    if (!detailsPath) return;

    setIsDetailLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}${detailsPath}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSelectedEventDetails(data.details || null);
    } catch (err) {
      console.error("Error fetching PALY calendar event details:", err);
      setDetailError("Details unavailable");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const detailLines =
    selectedEventDetails?.description ||
    (selectedEvent?.description ? [selectedEvent.description] : []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing["2xl"],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchEvents(true)}
            tintColor={PALY_GREEN}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <Pressable
            onPress={() => moveMonth(-1)}
            style={[
              styles.iconButton,
              { backgroundColor: surfaceColor, borderColor },
            ]}
          >
            <Feather name="chevron-left" size={22} color={theme.text} />
          </Pressable>
          <Pressable onPress={goToToday} style={styles.monthTitleButton}>
            <ThemedText style={styles.monthTitle}>
              {selectedDate.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </ThemedText>
            {!isSameDay(selectedDate, new Date()) && (
              <ThemedText style={[styles.todayHint, { color: mutedTextColor }]}>
                Today
              </ThemedText>
            )}
          </Pressable>
          <Pressable
            onPress={() => moveMonth(1)}
            style={[
              styles.iconButton,
              { backgroundColor: surfaceColor, borderColor },
            ]}
          >
            <Feather name="chevron-right" size={22} color={theme.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.calendarGrid,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day, index) => (
              <View key={`${day}-${index}`} style={styles.weekDayCell}>
                <ThemedText
                  style={[styles.weekDayText, { color: mutedTextColor }]}
                >
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const dayDate = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                day,
              );
              const dayKey = toDateKey(dayDate);
              const isSelected = dayKey === selectedDayKey;
              const isCurrentDay = isSameDay(dayDate, new Date());
              const dayEvents = events.filter(
                (event) => getEventDateKey(event) === dayKey,
              );

              return (
                <Pressable
                  key={dayKey}
                  onPress={() => setSelectedDate(dayDate)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: PALY_GREEN },
                    isCurrentDay &&
                      !isSelected && { borderColor: PALY_GOLD, borderWidth: 1 },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayText,
                      { color: isSelected ? "#fff" : theme.text },
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </ThemedText>
                  {dayEvents.length > 0 && (
                    <View style={styles.dotRow}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <View
                          key={event.id}
                          style={[
                            styles.eventDot,
                            {
                              borderColor: isSelected
                                ? "rgba(255,255,255,0.55)"
                                : isDark
                                  ? "rgba(255,255,255,0.18)"
                                  : "rgba(0,0,0,0.18)",
                              backgroundColor: isSelected
                                ? "#fff"
                                : normalizeEventColor(event.calendarColor),
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.dayHeader}>
          <Pressable
            onPress={() => moveDay(-1)}
            style={[
              styles.iconButtonSmall,
              { backgroundColor: surfaceColor, borderColor },
            ]}
          >
            <Feather name="chevron-left" size={18} color={theme.text} />
          </Pressable>
          <View style={styles.dayTitleWrap}>
            <ThemedText style={styles.dayTitle}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </ThemedText>
            <ThemedText style={[styles.dayCount, { color: mutedTextColor }]}>
              {eventsForSelectedDay.length === 1
                ? "1 event"
                : `${eventsForSelectedDay.length} events`}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => moveDay(1)}
            style={[
              styles.iconButtonSmall,
              { backgroundColor: surfaceColor, borderColor },
            ]}
          >
            <Feather name="chevron-right" size={18} color={theme.text} />
          </Pressable>
        </View>

        {isLoading ? (
          <View
            style={[styles.stateBlock, { backgroundColor: mutedSurfaceColor }]}
          >
            <ActivityIndicator size="small" color={PALY_GREEN} />
            <ThemedText style={[styles.stateText, { color: mutedTextColor }]}>
              Loading school events
            </ThemedText>
          </View>
        ) : error ? (
          <View
            style={[styles.stateBlock, { backgroundColor: mutedSurfaceColor }]}
          >
            <Feather name="alert-circle" size={28} color="#B42318" />
            <ThemedText style={styles.stateTitle}>{error}</ThemedText>
            <Pressable
              onPress={() => fetchEvents()}
              style={[styles.retryButton, { borderColor }]}
            >
              <Feather name="refresh-cw" size={14} color={theme.text} />
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : eventsForSelectedDay.length === 0 ? (
          <View
            style={[styles.stateBlock, { backgroundColor: mutedSurfaceColor }]}
          >
            <Feather name="sun" size={30} color={PALY_GOLD} />
            <ThemedText style={styles.stateTitle}>No school events</ThemedText>
            <ThemedText style={[styles.stateText, { color: mutedTextColor }]}>
              {selectedDate.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.eventList}>
            {eventsForSelectedDay.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`Open details for ${event.title}`}
                onPress={() => {
                  void openEventDetails(event);
                }}
                style={({ pressed }) => [
                  styles.eventCard,
                  pressed && styles.eventCardPressed,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.eventTimeRail,
                    {
                      backgroundColor: normalizeEventColor(event.calendarColor),
                    },
                  ]}
                />
                <View style={styles.eventBody}>
                  <View style={styles.eventMetaRow}>
                    <ThemedText
                      style={[
                        styles.eventTime,
                        {
                          color: event.allDay ? PALY_GREEN : mutedTextColor,
                        },
                      ]}
                    >
                      {formatEventTime(event)}
                    </ThemedText>
                    <View
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "#F1EEE8",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor: normalizeEventColor(
                              event.calendarColor,
                            ),
                          },
                        ]}
                      />
                      <ThemedText
                        style={[styles.categoryText, { color: mutedTextColor }]}
                        numberOfLines={1}
                      >
                        {event.calendarName}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.eventTitle}>
                    {event.title}
                  </ThemedText>
                  {event.location && (
                    <View style={styles.locationRow}>
                      <Feather
                        name="map-pin"
                        size={12}
                        color={mutedTextColor}
                      />
                      <ThemedText
                        style={[styles.locationText, { color: mutedTextColor }]}
                      >
                        {event.location}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <Modal
        animationType="none"
        onRequestClose={closeEventDetails}
        transparent
        visible={selectedEvent !== null}
      >
        {selectedEvent && (
          <View style={styles.detailModalRoot}>
            <Animated.View
              pointerEvents="none"
              style={[styles.detailBackdropScrim, { opacity: detailAnimation }]}
            />
            <Pressable
              accessibilityLabel="Close event details"
              onPress={closeEventDetails}
              style={styles.detailBackdrop}
            />
            <Animated.View
              style={[
                styles.detailSheet,
                {
                  backgroundColor: detailSheetColor,
                  borderColor,
                  opacity: detailAnimation,
                  transform: [{ translateY: detailSheetTranslateY }],
                },
              ]}
            >
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleWrap}>
                  <ThemedText
                    style={[styles.detailDate, { color: mutedTextColor }]}
                  >
                    {selectedEventDetails?.date ||
                      formatEventDateLabel(selectedEvent)}
                  </ThemedText>
                  <ThemedText style={styles.detailTitle}>
                    {selectedEventDetails?.title || selectedEvent.title}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityLabel="Close event details"
                  onPress={closeEventDetails}
                  style={[
                    styles.detailCloseButton,
                    { backgroundColor: mutedSurfaceColor },
                  ]}
                >
                  <Feather name="x" size={18} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.detailMetaRow}>
                <View
                  style={[
                    styles.categoryDot,
                    {
                      backgroundColor: normalizeEventColor(
                        selectedEventDetails?.calendarColor ||
                          selectedEvent.calendarColor,
                      ),
                    },
                  ]}
                />
                <ThemedText
                  style={[styles.detailMetaText, { color: mutedTextColor }]}
                >
                  {selectedEventDetails?.calendarName ||
                    selectedEvent.calendarName}
                </ThemedText>
                <ThemedText
                  style={[styles.detailMetaText, { color: mutedTextColor }]}
                >
                  {selectedEventDetails?.time || formatEventTime(selectedEvent)}
                </ThemedText>
              </View>

              {(selectedEventDetails?.location || selectedEvent.location) && (
                <View style={styles.detailLocationRow}>
                  <Feather name="map-pin" size={14} color={mutedTextColor} />
                  <ThemedText
                    style={[styles.detailMetaText, { color: mutedTextColor }]}
                  >
                    {selectedEventDetails?.location || selectedEvent.location}
                  </ThemedText>
                </View>
              )}

              <ScrollView
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
              >
                {isDetailLoading ? (
                  <View style={styles.detailStateRow}>
                    <ActivityIndicator size="small" color={PALY_GREEN} />
                    <ThemedText
                      style={[styles.detailStateText, { color: mutedTextColor }]}
                    >
                      Loading details
                    </ThemedText>
                  </View>
                ) : detailLines.length > 0 ? (
                  detailLines.map((line, index) => (
                    <View key={`${line}-${index}`} style={styles.detailLineRow}>
                      <View
                        style={[
                          styles.detailLineDot,
                          {
                            backgroundColor: normalizeEventColor(
                              selectedEventDetails?.calendarColor ||
                                selectedEvent.calendarColor,
                            ),
                          },
                        ]}
                      />
                      <ThemedText style={styles.detailLineText}>
                        {line}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText
                    style={[styles.detailStateText, { color: mutedTextColor }]}
                  >
                    {detailError || "No additional details"}
                  </ThemedText>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </Modal>
    </ThemedView>
  );
}

function getMonthRange(monthKey: string): { timeMin: string; timeMax: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCalendarDays(date: Date): (number | null)[] {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) days.push(day);

  return days;
}

function compareEvents(a: PalyCalendarEvent, b: PalyCalendarEvent): number {
  if (a.allDay && !b.allDay) return -1;
  if (!a.allDay && b.allDay) return 1;
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

function formatEventTime(event: PalyCalendarEvent): string {
  if (event.allDay) return "All day";

  const start = new Date(event.startTime);
  const startText = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!event.endTime) return startText;

  const end = new Date(event.endTime);
  const endText = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startText} - ${endText}`;
}

function formatEventDateLabel(event: PalyCalendarEvent): string {
  const [year, month, day] = event.date.split("-").map(Number);
  const date =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month - 1, day)
      : new Date(event.startTime);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEventDateKey(event: PalyCalendarEvent): string {
  return event.date || toDateKey(new Date(event.startTime));
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeEventColor(color: string | null | undefined): string {
  if (!color) return PALY_GREEN;
  return color.trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignSelf: "center",
    maxWidth: 720,
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  monthTitleButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  todayHint: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
  calendarGrid: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDayCell: {
    alignItems: "center",
    flex: 1,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "800",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: BorderRadius.sm,
    height: 48,
    justifyContent: "center",
    marginVertical: 2,
    width: `${100 / 7}%`,
  },
  dayText: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectedDayText: {
    fontWeight: "800",
  },
  dotRow: {
    bottom: 5,
    flexDirection: "row",
    gap: 2,
    position: "absolute",
  },
  eventDot: {
    borderRadius: 3,
    borderWidth: 1,
    height: 6,
    width: 6,
  },
  dayHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconButtonSmall: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  dayTitleWrap: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  dayCount: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  stateBlock: {
    alignItems: "center",
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing["2xl"],
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  stateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  eventList: {
    gap: Spacing.sm,
  },
  eventCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  eventCardPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.995 }],
  },
  eventTimeRail: {
    width: 5,
  },
  eventBody: {
    flex: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  eventMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  eventTime: {
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryPill: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    flexShrink: 1,
    gap: Spacing.xs,
    minHeight: 26,
    paddingHorizontal: Spacing.sm,
  },
  categoryDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  categoryText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  detailBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailSheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    maxHeight: "82%",
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  detailHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
  },
  detailTitleWrap: {
    flex: 1,
    gap: Spacing.xs,
  },
  detailDate: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  detailCloseButton: {
    alignItems: "center",
    borderRadius: BorderRadius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  detailMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  detailMetaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailLocationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  detailContent: {
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  detailLineRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  detailLineDot: {
    borderRadius: 5,
    height: 9,
    marginTop: 7,
    width: 9,
  },
  detailLineText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  detailStateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  detailStateText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
