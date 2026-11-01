import React, { ReactNode, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { DesktopShell } from "@/components/DesktopShell";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { apiRequest } from "@/lib/query-client";

type DashboardNavigationProp = NavigationProp<any>;

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

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  source: "paly";
  date: string;
  calendarColor?: string;
}

interface TodoItem {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  priority: string;
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
  requiresAuth?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "calendar",
    title: "Calendar",
    subtitle: "View upcoming events",
    icon: "calendar",
    color: "#006931",
    route: "Calendar",
  },
  {
    id: "todos",
    title: "To-Do List",
    subtitle: "Manage your tasks",
    icon: "check-square",
    color: "#F59E0B",
    route: "TodoList",
    requiresAuth: true,
  },
  {
    id: "map",
    title: "Campus Map",
    subtitle: "Find rooms & buildings",
    icon: "map-pin",
    color: "#10B981",
    route: "Map",
  },
  {
    id: "directory",
    title: "Staff Directory",
    subtitle: "Find teachers & staff",
    icon: "users",
    color: "#8B5CF6",
    route: "StaffDirectory",
  },
];

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function DashboardScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark, theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<DashboardNavigationProp>();

  const isWeb = Platform.OS === "web";
  const { width: screenWidth } = useWindowDimensions();
  const menuColumns = isWeb ? (screenWidth >= 1800 ? 4 : 3) : 2;
  const contentWidth = isWeb
    ? Math.max(960, screenWidth - 250 - 36 - Spacing.lg * 2)
    : screenWidth - Spacing.lg * 2;
  const cardWidth = isWeb
    ? (contentWidth - Spacing.md * (menuColumns - 1)) / menuColumns
    : (screenWidth - Spacing.lg * 3) / 2;

  // Schedule state
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [myClasses, setMyClasses] = useState<ManualClass[]>([]);
  const [nextPeriod, setNextPeriod] = useState<{
    period: string | number;
    start: string;
    timeUntil: number; // seconds until start
    className: string | null; // class name or "PREP"
  } | null>(null);

  // Calendar and todo state
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [pendingTodos, setPendingTodos] = useState<TodoItem[]>([]);

  // Fetch schedule data, classes, calendar events, and todos
  useFocusEffect(
    useCallback(() => {
      const fetchDashboardData = async () => {
        try {
          const now = new Date();
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const fetches: (Promise<Response> | null)[] = [
            fetch(`${getApiUrl()}api/schedule/today`, {
              credentials: "include",
            }),
            fetch(`${getApiUrl()}api/classes`, { credentials: "include" }),
            fetch(
              `${getApiUrl()}api/paly-calendar/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(weekLater.toISOString())}`,
            ),
          ];

          if (isAuthenticated) {
            fetches.push(
              fetch(`${getApiUrl()}api/todos/upcoming`, {
                credentials: "include",
              }),
            );
          }

          const results = await Promise.all(fetches);
          const [scheduleRes, classesRes, calendarRes, todosRes] = results;

          if (scheduleRes?.ok) {
            const data = await scheduleRes.json();
            setScheduleData(data);
          }

          if (classesRes?.ok) {
            const classesData = await classesRes.json();
            setMyClasses(classesData);
          }

          if (calendarRes?.ok) {
            const eventsData = await calendarRes.json();
            setUpcomingEvents(eventsData.events || []);
          }

          if (isAuthenticated && todosRes?.ok) {
            const todosData = await todosRes.json();
            setPendingTodos(todosData);
          }
        } catch (err) {
          console.error("Error fetching dashboard data:", err);
        }
      };
      fetchDashboardData();
    }, [isAuthenticated]),
  );

  // Calculate next period and update countdown
  useEffect(() => {
    if (!scheduleData?.hasSchedule || !scheduleData.periods.length) {
      setNextPeriod(null);
      return;
    }

    const calculateNextPeriod = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

      // Find the next period that hasn't started yet (skip brunch/lunch)
      for (const period of scheduleData.periods) {
        // Check if this is brunch or lunch
        const isBreak =
          typeof period.period === "string" &&
          (period.period.toLowerCase().includes("lunch") ||
            period.period.toLowerCase().includes("brunch"));

        // Skip brunch/lunch periods
        if (isBreak) {
          continue;
        }

        const [startHour, startMinute] = period.start.split(":").map(Number);
        const startTime = startHour * 60 + startMinute;

        if (startTime > currentTime) {
          // Calculate seconds until this period starts
          const periodStart = new Date(now);
          periodStart.setHours(startHour, startMinute, 0, 0);
          const timeUntil = Math.floor(
            (periodStart.getTime() - now.getTime()) / 1000,
          );

          // Find class name for this period
          let className: string | null = null;
          const periodNum =
            typeof period.period === "number"
              ? period.period
              : parseInt(String(period.period));
          if (!isNaN(periodNum)) {
            // Check manual classes first
            const manualClass = myClasses.find((c) => c.period === periodNum);
            if (manualClass) {
              className = manualClass.className;
            } else {
              className = "PREP";
            }
          }

          setNextPeriod({
            period: period.period,
            start: period.start,
            timeUntil,
            className,
          });
          return;
        }
      }

      // If no future period found, all periods have passed
      setNextPeriod(null);
    };

    calculateNextPeriod();

    // Update every second
    const interval = setInterval(calculateNextPeriod, 1000);
    return () => clearInterval(interval);
  }, [scheduleData, myClasses]);

  // Format countdown time
  const formatCountdown = (seconds: number): string => {
    if (seconds < 0) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Format time to include AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Toggle a todo from the dashboard
  const toggleTodo = async (id: string) => {
    try {
      const res = await apiRequest("PATCH", `/api/todos/${id}/toggle`);
      const updated = await res.json();
      setPendingTodos((prev) =>
        updated.completed
          ? prev.filter((t) => t.id !== id)
          : prev.map((t) => (t.id === id ? updated : t)),
      );
    } catch (err) {
      console.error("Error toggling todo:", err);
    }
  };

  // Format event time for dashboard display
  const formatEventTime = (startTime: string, allDay: boolean) => {
    if (allDay) return "All day";
    const date = new Date(startTime);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatEventDateLabel = (event: CalendarEvent) => {
    const eventDate = event.date
      ? parseDateKey(event.date)
      : new Date(event.startTime);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate.toDateString() === now.toDateString()) return "Today";
    if (eventDate.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return eventDate.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Format due date for dashboard display
  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const timeStr = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  };

  // Check if it's a late start and if Period 5 (first period) has already ended
  const isLateStart =
    scheduleData?.scheduleType?.toLowerCase().includes("late start") ||
    scheduleData?.scheduleTitle?.toLowerCase().includes("late start");

  // Check if Period 5 has already ended (hide late start banner if so)
  const shouldShowLateStartBanner = (() => {
    if (!isLateStart || !scheduleData?.periods.length) return false;

    // Find Period 5 (first period in late start schedules)
    // Check for period 5 as number, string "5", or string containing "5"
    const period5 = scheduleData.periods.find((p) => {
      const periodStr = String(p.period).toLowerCase();
      return (
        p.period === 5 ||
        p.period === "5" ||
        periodStr === "period 5" ||
        periodStr.startsWith("5")
      );
    });

    // If no Period 5 found, use the first period (late start typically starts with Period 5)
    const firstPeriod = period5 || scheduleData.periods[0];

    if (!firstPeriod) return true; // Show banner if no periods found

    // Check if the first period has ended
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [endHour, endMinute] = firstPeriod.end.split(":").map(Number);
    const endTime = endHour * 60 + endMinute;

    // Hide banner if the first period has ended
    return currentTime < endTime;
  })();

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.requiresAuth && !isAuthenticated) {
      // Navigate to sign in
      navigation.navigate("ProfileTab");
      return;
    }
    navigation.navigate(item.route);
  };

  const cardBackgroundColor = isWeb
    ? isDark
      ? "rgba(255, 255, 255, 0.04)"
      : "#FFFFFF"
    : isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0, 0, 0, 0.03)";
  const borderColor = isWeb
    ? isDark
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(0, 0, 0, 0.06)"
    : isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.08)";
  const webSectionTitleStyle = isWeb
    ? { fontSize: 22, letterSpacing: -0.5, fontWeight: "800" as const }
    : undefined;

  const webCardBaseShadow = isDark
    ? "0 1px 2px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)";
  const webCardHoverShadow = isDark
    ? "0 4px 16px rgba(0,0,0,0.4)"
    : "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)";

  const webCardShadowStyle = isWeb
    ? ({
        boxShadow: webCardBaseShadow,
      } as any)
    : undefined;

  // Web hover wrapper for cards
  const WebCardHover = ({ children }: { children: React.ReactNode }) => {
    if (!isWeb) return <>{children}</>;
    return (
      <div
        style={{
          borderRadius: 14,
          transition: "all 0.2s ease",
          transform: "translateY(0)",
          boxShadow: webCardBaseShadow,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform =
            "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            webCardHoverShadow;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            webCardBaseShadow;
        }}
      >
        {children}
      </div>
    );
  };

  const wrapWebAnimatedSection = (order: number, content: ReactNode) => {
    if (!isWeb) {
      return content;
    }

    return (
      <Animated.View
        entering={FadeInUp.delay(Math.min(order * 55, 385)).duration(420)}
        layout={LinearTransition.springify().damping(20).stiffness(140)}
      >
        {content}
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <DesktopShell maxWidth={null}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.lg,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          {wrapWebAnimatedSection(
            0,
            <View style={styles.welcomeSection}>
              <ThemedText
                style={[
                  styles.welcomeTitle,
                  isWeb && {
                    fontSize: 40,
                    letterSpacing: -1.2,
                    fontWeight: "800" as const,
                  },
                ]}
              >
                Dashboard
              </ThemedText>
              <ThemedText
                style={[
                  styles.welcomeSubtitle,
                  { color: isDark ? "rgba(255,255,255,0.5)" : "#9CA3AF" },
                  isWeb && { fontSize: 17, letterSpacing: -0.2 },
                ]}
              >
                Quick access to all your tools
              </ThemedText>
            </View>,
          )}

          {/* Schedule Info Section */}
          {scheduleData?.hasSchedule &&
            wrapWebAnimatedSection(
              1,
              <View style={styles.section}>
                {/* Late Start Banner */}
                {shouldShowLateStartBanner && (
                  <View
                    style={[
                      styles.lateStartBanner,
                      {
                        backgroundColor: isDark
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(245, 158, 11, 0.1)",
                        borderColor: isDark
                          ? "rgba(245, 158, 11, 0.3)"
                          : "rgba(245, 158, 11, 0.3)",
                      },
                    ]}
                  >
                    <Feather name="clock" size={20} color="#F59E0B" />
                    <ThemedText
                      style={[styles.lateStartText, { color: "#F59E0B" }]}
                    >
                      Late Start Today
                    </ThemedText>
                  </View>
                )}

                {/* Next Period Countdown */}
                {nextPeriod && (
                  <View
                    style={[
                      styles.nextPeriodCard,
                      {
                        backgroundColor: cardBackgroundColor,
                        borderColor: borderColor,
                      },
                      isWeb &&
                        ({
                          borderLeftWidth: 3,
                          borderLeftColor: "transparent",
                          borderRadius: 14,
                          borderImage: isDark
                            ? "linear-gradient(180deg, #0A84FF, #6366F1) 1"
                            : "linear-gradient(180deg, #007AFF, #6366F1) 1",
                          boxShadow: isDark
                            ? "0 2px 12px rgba(10,132,255,0.15)"
                            : "0 2px 12px rgba(0,122,255,0.08)",
                        } as any),
                    ]}
                  >
                    <View style={styles.nextPeriodHeader}>
                      <View style={styles.nextPeriodHeaderLeft}>
                        <Feather name="bell" size={20} color={theme.link} />
                        <ThemedText style={styles.nextPeriodTitle}>
                          Next Period
                        </ThemedText>
                      </View>
                      <LinearGradient
                        colors={[theme.link, theme.link + "CC"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.periodPill}
                      >
                        <ThemedText style={styles.periodPillText}>
                          Period {nextPeriod.period}
                        </ThemedText>
                      </LinearGradient>
                    </View>
                    <View style={styles.nextPeriodInfo}>
                      <View style={styles.countdownRow}>
                        <ThemedText
                          style={[styles.countdownText, { color: theme.link }]}
                        >
                          {formatCountdown(nextPeriod.timeUntil)}
                        </ThemedText>
                        {nextPeriod.className && (
                          <View
                            style={[
                              styles.classNamePill,
                              {
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.05)",
                              },
                            ]}
                          >
                            <ThemedText style={styles.classNameText}>
                              {nextPeriod.className}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText
                        style={[
                          styles.nextPeriodTime,
                          { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
                        ]}
                      >
                        Starts at {formatTime(nextPeriod.start)}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>,
            )}

          {/* Upcoming Events Section */}
          {upcomingEvents.length > 0 &&
            wrapWebAnimatedSection(
              3,
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText
                    style={[styles.sectionTitle, webSectionTitleStyle]}
                  >
                    Upcoming Events
                  </ThemedText>
                  <Pressable onPress={() => navigation.navigate("Calendar")}>
                    <ThemedText
                      style={[styles.seeAllText, { color: theme.link }]}
                    >
                      See All
                    </ThemedText>
                  </Pressable>
                </View>
                {upcomingEvents.slice(0, 3).map((event) => (
                  <Pressable
                    key={event.id}
                    style={[
                      styles.dashboardEventCard,
                      { backgroundColor: cardBackgroundColor, borderColor },
                      isWeb &&
                        ({
                          borderRadius: 14,
                          ...webCardShadowStyle,
                          transition: "all 0.2s ease",
                        } as any),
                    ]}
                    onPress={() => navigation.navigate("Calendar")}
                  >
                    <View
                      style={[
                        styles.dashboardEventColorBar,
                        { backgroundColor: event.calendarColor || "#006931" },
                      ]}
                    />
                    <View style={styles.dashboardEventContent}>
                      <ThemedText
                        style={styles.dashboardEventTitle}
                        numberOfLines={1}
                      >
                        {event.title}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.dashboardEventTime,
                          { color: isDark ? "#888" : "#666" },
                        ]}
                      >
                        {formatEventTime(event.startTime, event.allDay)}
                        {" - "}
                        {formatEventDateLabel(event)}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>,
            )}

          {/* To-Do Section */}
          {isAuthenticated &&
            pendingTodos.length > 0 &&
            wrapWebAnimatedSection(
              4,
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText
                    style={[styles.sectionTitle, webSectionTitleStyle]}
                  >
                    To-Do
                  </ThemedText>
                  <Pressable onPress={() => navigation.navigate("TodoList")}>
                    <ThemedText
                      style={[styles.seeAllText, { color: theme.link }]}
                    >
                      See All
                    </ThemedText>
                  </Pressable>
                </View>
                {pendingTodos.slice(0, 3).map((todo) => (
                  <Pressable
                    key={todo.id}
                    style={[
                      styles.dashboardTodoCard,
                      { backgroundColor: cardBackgroundColor, borderColor },
                      isWeb &&
                        ({
                          borderRadius: 14,
                          ...webCardShadowStyle,
                          transition: "all 0.2s ease",
                        } as any),
                    ]}
                    onPress={() => toggleTodo(todo.id)}
                  >
                    <Feather
                      name="circle"
                      size={20}
                      color={isDark ? "#666" : "#999"}
                    />
                    <View style={styles.dashboardTodoContent}>
                      <ThemedText
                        style={styles.dashboardTodoTitle}
                        numberOfLines={1}
                      >
                        {todo.title}
                      </ThemedText>
                      {todo.dueDate && (
                        <ThemedText
                          style={[
                            styles.dashboardTodoDue,
                            {
                              color:
                                new Date(todo.dueDate) < new Date()
                                  ? "#EF4444"
                                  : isDark
                                    ? "#888"
                                    : "#666",
                            },
                          ]}
                        >
                          {formatDueDate(todo.dueDate)}
                        </ThemedText>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>,
            )}

          {/* Menu Grid */}
          {wrapWebAnimatedSection(
            6,
            <View style={styles.menuGrid}>
              {MENU_ITEMS.map((item) => {
                const card = (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.menuCard,
                      {
                        width: isWeb ? undefined : cardWidth,
                        backgroundColor: cardBackgroundColor,
                        borderColor: borderColor,
                      },
                      isWeb &&
                        ({
                          borderRadius: 14,
                          cursor: "pointer",
                          flex: 1,
                          minWidth: 200,
                        } as any),
                    ]}
                    onPress={() => handleMenuItemPress(item)}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <Feather name={item.icon} size={28} color={item.color} />
                    </View>
                    <ThemedText style={styles.menuTitle}>
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.menuSubtitle,
                        {
                          color: isDark ? "rgba(255,255,255,0.45)" : "#9CA3AF",
                        },
                      ]}
                    >
                      {item.subtitle}
                    </ThemedText>
                  </Pressable>
                );

                if (isWeb) {
                  return <WebCardHover key={item.id}>{card}</WebCardHover>;
                }
                return card;
              })}
            </View>,
          )}

          {/* Quick Links Section */}
          {wrapWebAnimatedSection(
            8,
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, webSectionTitleStyle]}>
                Quick Links
              </ThemedText>
              <View
                style={[
                  styles.linkCard,
                  { backgroundColor: cardBackgroundColor, borderColor },
                  isWeb &&
                    ({
                      borderRadius: 14,
                      ...webCardShadowStyle,
                    } as any),
                ]}
              >
                <Pressable
                  style={styles.linkRow}
                  onPress={() => navigation.navigate("About")}
                >
                  <View style={styles.linkLeft}>
                    <Feather
                      name="info"
                      size={20}
                      color={isDark ? "#999" : "#666"}
                    />
                    <ThemedText style={styles.linkText}>About Us</ThemedText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={isDark ? "#555" : "#999"}
                  />
                </Pressable>

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    },
                  ]}
                />

                <Pressable
                  style={styles.linkRow}
                  onPress={() => navigation.navigate("ContactUs")}
                >
                  <View style={styles.linkLeft}>
                    <Feather
                      name="mail"
                      size={20}
                      color={isDark ? "#999" : "#666"}
                    />
                    <ThemedText style={styles.linkText}>Contact Us</ThemedText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={isDark ? "#555" : "#999"}
                  />
                </Pressable>

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    },
                  ]}
                />

                <Pressable
                  style={styles.linkRow}
                  onPress={() => navigation.navigate("Policies")}
                >
                  <View style={styles.linkLeft}>
                    <Feather
                      name="shield"
                      size={20}
                      color={isDark ? "#999" : "#666"}
                    />
                    <ThemedText style={styles.linkText}>Policies</ThemedText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={isDark ? "#555" : "#999"}
                  />
                </Pressable>
              </View>
            </View>,
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
    paddingHorizontal: Spacing.lg,
  },
  welcomeSection: {
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 40,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  menuCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 140,
    justifyContent: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  linkCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  linkText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.sm,
  },
  coursesList: {
    marginTop: Spacing.md,
  },
  miniCourseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  miniCourseInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  periodBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  miniCourseName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  miniGradeContainer: {
    alignItems: "flex-end",
  },
  miniGrade: {
    fontSize: 16,
    fontWeight: "700",
  },
  miniGradePercent: {
    fontSize: 12,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  lateStartBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  lateStartText: {
    fontSize: 15,
    fontWeight: "600",
  },
  nextPeriodCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  nextPeriodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  nextPeriodHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nextPeriodTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  periodPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  periodPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  nextPeriodInfo: {
    gap: Spacing.xs,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  countdownText: {
    fontSize: 24,
    fontWeight: "700",
  },
  classNamePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  classNameText: {
    fontSize: 13,
    fontWeight: "600",
  },
  nextPeriodTime: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  reauthCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  reauthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  reauthTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  reauthSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  dashboardEventCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  dashboardEventColorBar: {
    width: 4,
  },
  dashboardEventContent: {
    flex: 1,
    padding: Spacing.md,
    gap: 2,
  },
  dashboardEventTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  dashboardEventTime: {
    fontSize: 13,
  },
  dashboardTodoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  dashboardTodoContent: {
    flex: 1,
    gap: 2,
  },
  dashboardTodoTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  dashboardTodoDue: {
    fontSize: 12,
  },
});
