import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DesktopShell } from "@/components/DesktopShell";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { ScheduleStackParamList } from "@/navigation/ScheduleStackNavigator";

interface SchedulePeriod {
  period: string | number;
  start: string;
  end: string;
}

interface ScheduleData {
  date: string;
  scheduleTitle: string | null;
  scheduleType: string | null;
  periods: SchedulePeriod[];
  hasSchedule: boolean;
}

interface ManualClass {
  id: string;
  className: string;
  teacherName: string | null;
  roomNumber: string | null;
  period: number;
}

type ScheduleNavigationProp = NativeStackNavigationProp<
  ScheduleStackParamList,
  "Schedule"
>;

// Helper to get the next weekday
function getNextWeekday(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

// Helper to get the previous weekday
function getPreviousWeekday(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  while (prev.getDay() === 0 || prev.getDay() === 6) {
    prev.setDate(prev.getDate() - 1);
  }
  return prev;
}

// Check if the school day has ended
function hasSchoolDayEnded(scheduleData: ScheduleData | null): boolean {
  if (!scheduleData?.periods?.length) return false;

  const now = new Date();
  const lastPeriod = scheduleData.periods[scheduleData.periods.length - 1];
  const [endHour, endMinute] = lastPeriod.end.split(":").map(Number);
  const endTime = endHour * 60 + endMinute;
  const currentTime = now.getHours() * 60 + now.getMinutes();

  return currentTime >= endTime;
}

// Format date as YYYY-MM-DD
function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function ScheduleScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<ScheduleNavigationProp>();
  const isWeb = Platform.OS === "web";

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Schedule state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [myClasses, setMyClasses] = useState<ManualClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasAutoAdvanced, setHasAutoAdvanced] = useState(false);

  // Derived values
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const isToday = isSameDay(selectedDate, new Date());

  // Auto-advance to next weekday if school day has ended
  useEffect(() => {
    if (
      !hasAutoAdvanced &&
      isToday &&
      scheduleData &&
      hasSchoolDayEnded(scheduleData)
    ) {
      setHasAutoAdvanced(true);
      setSelectedDate(getNextWeekday(new Date()));
    }
  }, [scheduleData, hasAutoAdvanced, isToday]);

  // Update current time every minute to refresh current period highlighting
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dateStr = formatDateForApi(selectedDate);
        const [bellRes, classesRes] = await Promise.all([
          fetch(`${getApiUrl()}api/schedule/today?date=${dateStr}`, {
            credentials: "include",
          }),
          fetch(`${getApiUrl()}api/classes`, { credentials: "include" }),
        ]);

        if (!bellRes.ok) throw new Error("Failed to fetch schedule");
        const bellData = await bellRes.json();
        setScheduleData(bellData);

        if (classesRes.ok) {
          const classesData = await classesRes.json();
          setMyClasses(classesData);
        }
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setError("Unable to load schedule");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [selectedDate]);

  // Re-fetch every time this screen comes into focus or date changes
  useFocusEffect(fetchData);

  // Navigation handlers
  const goToPreviousDay = () => {
    setSelectedDate(getPreviousWeekday(selectedDate));
  };

  const goToNextDay = () => {
    setSelectedDate(getNextWeekday(selectedDate));
  };

  const goToToday = () => {
    const today = new Date();
    // If it's a weekend, go to Monday
    if (today.getDay() === 0 || today.getDay() === 6) {
      setSelectedDate(getNextWeekday(today));
    } else {
      setSelectedDate(today);
    }
    // Keep hasAutoAdvanced true so we don't auto-advance away when the user explicitly chose today
    setHasAutoAdvanced(true);
  };

  // Format time to include AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const deleteClass = async (classId: string) => {
    try {
      await apiRequest("DELETE", `/api/classes/${classId}`);
      setMyClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch {
      console.error("Failed to delete class");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <DesktopShell>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.xl,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Header with Navigation */}
          <View style={styles.dateHeader}>
            <View style={styles.dateNavRow}>
              <Pressable
                onPress={goToPreviousDay}
                style={[
                  styles.navButton,
                  { backgroundColor: isDark ? "#2A2C2E" : "#f0f0f0" },
                  isWeb && ({
                    backgroundColor: isDark ? "#23262B" : "#F8F9FA",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    // @ts-ignore: web-only
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  } as any),
                ]}
                hitSlop={8}
              >
                <Feather name="chevron-left" size={20} color={theme.text} />
              </Pressable>

              <View style={styles.dateCenter}>
                <ThemedText
                  style={[
                    styles.dayText,
                    isWeb && {
                      fontSize: 28,
                      fontWeight: "800",
                      letterSpacing: -0.6,
                    },
                  ]}
                >
                  {dayNames[selectedDate.getDay()]}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dateText,
                    { color: theme.link },
                    isWeb && { fontSize: 15, fontWeight: "500" },
                  ]}
                >
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </ThemedText>
              </View>

              <Pressable
                onPress={goToNextDay}
                style={[
                  styles.navButton,
                  { backgroundColor: isDark ? "#2A2C2E" : "#f0f0f0" },
                  isWeb && ({
                    backgroundColor: isDark ? "#23262B" : "#F8F9FA",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    // @ts-ignore: web-only
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  } as any),
                ]}
                hitSlop={8}
              >
                <Feather name="chevron-right" size={20} color={theme.text} />
              </Pressable>
            </View>

            {!isToday && (
              <Pressable
                onPress={goToToday}
                style={[
                  styles.todayButton,
                  isWeb && {
                    backgroundColor: isDark
                      ? "rgba(10,132,255,0.12)"
                      : "rgba(0,122,255,0.08)",
                    borderRadius: 20,
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    // @ts-ignore: web-only
                    cursor: "pointer",
                  },
                ]}
              >
                <ThemedText
                  style={[styles.todayButtonText, { color: theme.link }]}
                >
                  Go to Today
                </ThemedText>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.link} />
              <ThemedText
                style={[
                  styles.loadingText,
                  { color: isDark ? "#888" : "#666" },
                ]}
              >
                Loading schedule...
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Feather name="alert-circle" size={48} color={theme.link} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <ThemedText
                style={[
                  styles.weekendSubtext,
                  { color: isDark ? "#888" : "#666" },
                ]}
              >
                Please try again later
              </ThemedText>
            </View>
          ) : isWeekend || !scheduleData?.hasSchedule ? (
            <View style={styles.centerContainer}>
              <Feather name="sun" size={48} color={theme.link} />
              <ThemedText style={styles.weekendText}>
                {isWeekend ? "Enjoy your weekend!" : "No schedule today"}
              </ThemedText>
              <ThemedText
                style={[
                  styles.weekendSubtext,
                  { color: isDark ? "#888" : "#666" },
                ]}
              >
                No classes scheduled for today
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Bell Schedule */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    Bell Schedule
                  </ThemedText>
                  {scheduleData?.scheduleTitle && (
                    <View
                      style={[
                        styles.scheduleTypeBadge,
                        { backgroundColor: theme.link + "20" },
                      ]}
                    >
                      <ThemedText
                        style={[styles.scheduleTypeText, { color: theme.link }]}
                      >
                        {scheduleData.scheduleTitle}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {scheduleData?.scheduleType && (
                  <ThemedText
                    style={[
                      styles.scheduleTypeLabel,
                      { color: isDark ? "#888" : "#666" },
                    ]}
                  >
                    {scheduleData.scheduleType}
                  </ThemedText>
                )}

                <View
                  style={[
                    styles.scheduleCard,
                    { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" },
                    isWeb && {
                      backgroundColor: isDark ? "#191B1F" : "#FFFFFF",
                      borderRadius: 14,
                      overflow: "hidden",
                      // @ts-ignore: web-only
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "1px solid rgba(0,0,0,0.06)",
                      boxShadow: isDark
                        ? "none"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  {scheduleData?.periods.map((period, index) => {
                    const isBreak =
                      typeof period.period === "string" &&
                      (period.period.toLowerCase().includes("lunch") ||
                        period.period.toLowerCase().includes("brunch"));

                    // Check if this is the current period (only highlight if viewing today)
                    let isCurrentPeriod = false;
                    if (isToday) {
                      const now = new Date();
                      const nowMinutes = now.getHours() * 60 + now.getMinutes();
                      const [startHour, startMinute] = period.start
                        .split(":")
                        .map(Number);
                      const [endHour, endMinute] = period.end
                        .split(":")
                        .map(Number);
                      const startTime = startHour * 60 + startMinute;
                      const endTime = endHour * 60 + endMinute;
                      isCurrentPeriod =
                        nowMinutes >= startTime && nowMinutes < endTime;
                    }

                    // Find class for this period
                    let className: string | null = null;
                    if (!isBreak) {
                      const periodNum =
                        typeof period.period === "number"
                          ? period.period
                          : parseInt(String(period.period));
                      if (!isNaN(periodNum)) {
                        // Check manual classes first
                        const manualClass = myClasses.find(
                          (c) => c.period === periodNum,
                        );
                        if (manualClass) {
                          className = manualClass.className;
                        } else {
                          className = "PREP";
                        }
                      }
                    }

                    return (
                      <View
                        key={index}
                        style={[
                          styles.periodRow,
                          isCurrentPeriod && {
                            backgroundColor: isDark
                              ? "rgba(34, 197, 94, 0.15)"
                              : "rgba(34, 197, 94, 0.1)",
                          },
                          isWeb &&
                            isCurrentPeriod && {
                              backgroundColor: isDark
                                ? "rgba(34, 197, 94, 0.2)"
                                : "rgba(34, 197, 94, 0.14)",
                            },
                          isWeb && ({
                            // @ts-ignore: web-only
                            transition: "background-color 0.15s ease",
                          } as any),
                          index < (scheduleData?.periods.length || 0) - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)",
                          },
                        ]}
                      >
                        <View style={styles.periodInfo}>
                          <View
                            style={[
                              styles.periodBadge,
                              {
                                backgroundColor: isBreak
                                  ? "#4CAF50"
                                  : theme.link,
                              },
                              isWeb && {
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                              },
                            ]}
                          >
                            <ThemedText style={styles.periodBadgeText}>
                              {isBreak
                                ? period.period
                                : className
                                  ? `P${period.period} - ${className}`
                                  : `P${period.period}`}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText style={styles.timeText}>
                          {formatTime(period.start)} - {formatTime(period.end)}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Your Classes */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    Your Classes
                  </ThemedText>
                  <Pressable
                    onPress={() => navigation.navigate("AddClass")}
                    hitSlop={8}
                  >
                    <Feather name="plus-circle" size={22} color={theme.link} />
                  </Pressable>
                </View>

                {myClasses.length > 0 ? (
                  <View
                    style={[
                      styles.scheduleCard,
                      { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" },
                      isWeb && {
                        backgroundColor: isDark ? "#191B1F" : "#FFFFFF",
                        borderRadius: 14,
                        overflow: "hidden",
                        // @ts-ignore: web-only
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.06)"
                          : "1px solid rgba(0,0,0,0.06)",
                        boxShadow: isDark
                          ? "none"
                          : "0 1px 3px rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    {myClasses.map((cls, index) => (
                      <View
                        key={cls.id}
                        style={[
                          styles.classRow,
                          index < myClasses.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)",
                          },
                        ]}
                      >
                        <View style={styles.classInfo}>
                          <View
                            style={[
                              styles.periodBadge,
                              {
                                backgroundColor:
                                  cls.className === "Prep"
                                    ? "#4CAF50"
                                    : theme.link,
                              },
                            ]}
                          >
                            <ThemedText style={styles.periodBadgeText}>
                              P{cls.period}
                            </ThemedText>
                          </View>
                          <View style={styles.classDetails}>
                            <ThemedText style={styles.classNameText}>
                              {cls.className}
                            </ThemedText>
                            {cls.teacherName && (
                              <ThemedText
                                style={[
                                  styles.classMetaText,
                                  { color: isDark ? "#888" : "#666" },
                                ]}
                              >
                                {cls.teacherName}
                                {cls.roomNumber
                                  ? ` · Room ${cls.roomNumber}`
                                  : ""}
                              </ThemedText>
                            )}
                            {!cls.teacherName && cls.roomNumber && (
                              <ThemedText
                                style={[
                                  styles.classMetaText,
                                  { color: isDark ? "#888" : "#666" },
                                ]}
                              >
                                Room {cls.roomNumber}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                        <Pressable
                          onPress={() => deleteClass(cls.id)}
                          hitSlop={8}
                        >
                          <Feather
                            name="trash-2"
                            size={18}
                            color={isDark ? "#666" : "#999"}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => navigation.navigate("AddClass")}
                    style={[
                      styles.addClassCard,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(0,0,0,0.1)",
                      },
                      isWeb && ({
                        borderRadius: 14,
                        borderStyle: "dashed",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.08)",
                        // @ts-ignore: web-only
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      } as any),
                    ]}
                  >
                    <View style={styles.addClassContent}>
                      <View
                        style={[
                          styles.addIconContainer,
                          { backgroundColor: theme.link + "20" },
                        ]}
                      >
                        <Feather name="plus" size={24} color={theme.link} />
                      </View>
                      <View style={styles.addClassText}>
                        <ThemedText style={styles.addClassTitle}>
                          Add Your Classes
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.addClassSubtitle,
                            { color: isDark ? "#888" : "#666" },
                          ]}
                        >
                          Enter your schedule to see your classes here
                        </ThemedText>
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={isDark ? "#666" : "#999"}
                    />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </DesktopShell>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  dateHeader: {
    marginBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCenter: {
    flex: 1,
    alignItems: "center",
  },
  dayText: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
  },
  todayButton: {
    alignSelf: "center",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: Spacing.lg,
  },
  weekendText: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: Spacing.lg,
  },
  weekendSubtext: {
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    ...(Platform.OS === "web" ? { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.5 } : {}),
  },
  scheduleTypeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  scheduleTypeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scheduleTypeLabel: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  scheduleCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  periodInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  periodBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    minWidth: 50,
    alignItems: "center",
  },
  periodBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  classInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  classDetails: {
    marginLeft: Spacing.md,
  },
  classNameText: {
    fontSize: 15,
    fontWeight: "600",
  },
  classMetaText: {
    fontSize: 13,
    marginTop: 2,
  },
  addClassCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addClassContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  addIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  addClassText: {
    flex: 1,
  },
  addClassTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  addClassSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    minWidth: 36,
    alignItems: "center",
  },
  gradeText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
