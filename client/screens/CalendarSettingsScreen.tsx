import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface CalendarAccount {
  id: string;
  accountEmail: string;
  accountName: string | null;
  isEnabled: boolean;
  isPrimary: boolean;
  createdAt: string;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
  primary: boolean;
}

interface CalendarPreference {
  id: string;
  accountId: string;
  calendarId: string;
  calendarName: string;
  calendarColor: string | null;
  isEnabled: boolean;
}

export default function CalendarSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark, theme } = useTheme();
  const { user, getGoogleAccessToken } = useAuth();
  const navigation = useNavigation();

  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [preferences, setPreferences] = useState<CalendarPreference[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountCalendars, setAccountCalendars] = useState<Record<string, Calendar[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState<Set<string>>(new Set());

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, prefsRes] = await Promise.all([
        apiRequest("GET", "/api/calendar/accounts"),
        apiRequest("GET", "/api/calendar/preferences"),
      ]);

      if (accountsRes.ok && prefsRes.ok) {
        const accountsData = await accountsRes.json();
        const prefsData = await prefsRes.json();
        setAccounts(accountsData);
        setPreferences(prefsData);
      }
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefreshCalendar = async () => {
    setIsRefreshing(true);
    try {
      const freshToken = await getGoogleAccessToken();
      if (freshToken) {
        await apiRequest("POST", "/api/calendar/refresh-token", {
          accessToken: freshToken,
        });
        Alert.alert(
          "Success",
          "Calendar access refreshed successfully.",
        );
      } else {
        Alert.alert(
          "Error",
          "Could not refresh calendar access. Please sign out and sign back in.",
        );
      }
    } catch (err) {
      console.error("Error refreshing calendar:", err);
      Alert.alert(
        "Error",
        "Failed to refresh calendar access. Please try again.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      // Get fresh token for the new account (same Google user but separate calendar access)
      const freshToken = await getGoogleAccessToken();
      if (!freshToken) {
        Alert.alert("Error", "Could not get access token");
        return;
      }

      // Add the account
      const res = await apiRequest("POST", "/api/calendar/accounts", {
        accountEmail: user?.email || "",
        accountName: user?.displayName || "",
        accessToken: freshToken,
      });

      if (res.ok) {
        Alert.alert("Success", "Calendar account added successfully");
        fetchData();
      } else {
        const error = await res.json();
        Alert.alert("Error", error.error || "Failed to add account");
      }
    } catch (err) {
      console.error("Error adding account:", err);
      Alert.alert("Error", "Failed to add calendar account");
    }
  };

  const toggleAccount = async (id: string) => {
    try {
      const res = await apiRequest("PATCH", `/api/calendar/accounts/${id}/toggle`);
      if (res.ok) {
        const updated = await res.json();
        setAccounts(prev =>
          prev.map(acc => (acc.id === id ? { ...acc, isEnabled: updated.isEnabled } : acc))
        );
      }
    } catch (err) {
      console.error("Error toggling account:", err);
    }
  };

  const deleteAccount = async (id: string) => {
    Alert.alert(
      "Delete Calendar Account",
      "Are you sure you want to remove this calendar account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiRequest("DELETE", `/api/calendar/accounts/${id}`);
              if (res.ok) {
                setAccounts(prev => prev.filter(acc => acc.id !== id));
                setPreferences(prev => prev.filter(pref => pref.accountId !== id));
              }
            } catch (err) {
              console.error("Error deleting account:", err);
            }
          },
        },
      ]
    );
  };

  const toggleAccountExpanded = async (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
      // Fetch calendars for this account if not already loaded
      if (!accountCalendars[accountId]) {
        await fetchCalendarsForAccount(accountId);
      }
    }
    setExpandedAccounts(newExpanded);
  };

  const fetchCalendarsForAccount = async (accountId: string) => {
    setLoadingCalendars(prev => new Set(prev).add(accountId));
    try {
      const res = await apiRequest("GET", `/api/calendar/accounts/${accountId}/calendars`);
      if (res.ok) {
        const calendars = await res.json();
        setAccountCalendars(prev => ({ ...prev, [accountId]: calendars }));

        // Auto-save all calendars as preferences if not already saved
        for (const cal of calendars) {
          const existing = preferences.find(
            p => p.accountId === accountId && p.calendarId === cal.id
          );
          if (!existing) {
            await apiRequest("PUT", "/api/calendar/preferences", {
              accountId,
              calendarId: cal.id,
              calendarName: cal.name,
              calendarColor: cal.color,
              isEnabled: true,
            });
          }
        }
        // Refresh preferences
        const prefsRes = await apiRequest("GET", "/api/calendar/preferences");
        if (prefsRes.ok) {
          setPreferences(await prefsRes.json());
        }
      } else if (res.status === 401) {
        Alert.alert(
          "Token Expired",
          "Please refresh your calendar access or sign out and back in.",
        );
      }
    } catch (err) {
      console.error("Error fetching calendars:", err);
    } finally {
      setLoadingCalendars(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  const toggleCalendar = async (preferenceId: string) => {
    try {
      const res = await apiRequest("PATCH", `/api/calendar/preferences/${preferenceId}/toggle`);
      if (res.ok) {
        const updated = await res.json();
        setPreferences(prev =>
          prev.map(pref => (pref.id === preferenceId ? updated : pref))
        );
      }
    } catch (err) {
      console.error("Error toggling calendar:", err);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centeredContent, { paddingTop: headerHeight + Spacing["5xl"] }]}>
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
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
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Calendar Settings</ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: isDark ? "#888" : "#666" }]}
          >
            Manage your calendar accounts and visibility
          </ThemedText>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Actions</ThemedText>

          <Pressable
            style={[
              styles.actionCard,
              { backgroundColor: cardBackgroundColor, borderColor },
            ]}
            onPress={handleRefreshCalendar}
            disabled={isRefreshing}
          >
            <View style={styles.actionLeft}>
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: theme.link + "15" },
                ]}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={theme.link} />
                ) : (
                  <Feather name="refresh-cw" size={20} color={theme.link} />
                )}
              </View>
              <View style={styles.actionTextContainer}>
                <ThemedText style={styles.actionTitle}>
                  Refresh Calendar Access
                </ThemedText>
                <ThemedText
                  style={[
                    styles.actionSubtitle,
                    { color: isDark ? "#888" : "#666" },
                  ]}
                >
                  Re-sync your Google Calendar permissions
                </ThemedText>
              </View>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={isDark ? "#666" : "#999"}
            />
          </Pressable>
        </View>

        {/* Calendar Accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Calendar Accounts
            </ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.link }]}
              onPress={handleAddAccount}
            >
              <Feather name="plus" size={16} color="#fff" />
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            </Pressable>
          </View>

          {accounts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
              <Feather name="calendar" size={32} color={isDark ? "#666" : "#999"} />
              <ThemedText style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
                No calendar accounts connected
              </ThemedText>
            </View>
          ) : (
            accounts.map(account => {
              const isExpanded = expandedAccounts.has(account.id);
              const calendars = accountCalendars[account.id] || [];
              const accountPrefs = preferences.filter(p => p.accountId === account.id);
              const isLoadingCals = loadingCalendars.has(account.id);

              return (
                <View
                  key={account.id}
                  style={[
                    styles.accountCard,
                    { backgroundColor: cardBackgroundColor, borderColor },
                  ]}
                >
                  {/* Account Header */}
                  <Pressable
                    style={styles.accountHeader}
                    onPress={() => toggleAccountExpanded(account.id)}
                  >
                    <View style={styles.accountLeft}>
                      <View
                        style={[
                          styles.accountIconContainer,
                          {
                            backgroundColor: account.isEnabled
                              ? "#22C55E" + "15"
                              : isDark
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.03)",
                          },
                        ]}
                      >
                        <Feather
                          name="calendar"
                          size={20}
                          color={account.isEnabled ? "#22C55E" : isDark ? "#666" : "#999"}
                        />
                      </View>
                      <View style={styles.accountInfo}>
                        <View style={styles.accountNameRow}>
                          <ThemedText style={styles.accountEmail}>
                            {account.accountEmail}
                          </ThemedText>
                          {account.isPrimary && (
                            <View style={[styles.primaryBadge, { backgroundColor: theme.link + "15" }]}>
                              <ThemedText style={[styles.primaryBadgeText, { color: theme.link }]}>
                                Primary
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText
                          style={[
                            styles.accountStatus,
                            { color: isDark ? "#888" : "#666" },
                          ]}
                        >
                          {account.isEnabled ? "Active" : "Disabled"}
                        </ThemedText>
                      </View>
                    </View>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={isDark ? "#666" : "#999"}
                    />
                  </Pressable>

                  {/* Account Actions */}
                  <View style={styles.accountActions}>
                    <Pressable
                      style={styles.accountActionButton}
                      onPress={() => toggleAccount(account.id)}
                    >
                      <Feather
                        name={account.isEnabled ? "eye-off" : "eye"}
                        size={16}
                        color={isDark ? "#888" : "#666"}
                      />
                      <ThemedText style={[styles.accountActionText, { color: isDark ? "#888" : "#666" }]}>
                        {account.isEnabled ? "Disable" : "Enable"}
                      </ThemedText>
                    </Pressable>
                    {!account.isPrimary && (
                      <Pressable
                        style={styles.accountActionButton}
                        onPress={() => deleteAccount(account.id)}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                        <ThemedText style={[styles.accountActionText, { color: "#EF4444" }]}>
                          Remove
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>

                  {/* Expanded Calendars List */}
                  {isExpanded && (
                    <View style={styles.calendarsSection}>
                      <ThemedText
                        style={[
                          styles.calendarsSectionTitle,
                          { color: isDark ? "#888" : "#666" },
                        ]}
                      >
                        Calendars
                      </ThemedText>
                      {isLoadingCals ? (
                        <View style={styles.calendarLoading}>
                          <ActivityIndicator size="small" color={theme.link} />
                          <ThemedText style={[styles.calendarLoadingText, { color: isDark ? "#888" : "#666" }]}>
                            Loading calendars...
                          </ThemedText>
                        </View>
                      ) : calendars.length === 0 ? (
                        <ThemedText style={[styles.noCalendarsText, { color: isDark ? "#888" : "#666" }]}>
                          No calendars found
                        </ThemedText>
                      ) : (
                        calendars.map(cal => {
                          const pref = accountPrefs.find(p => p.calendarId === cal.id);
                          const isEnabled = pref?.isEnabled ?? true;

                          return (
                            <Pressable
                              key={cal.id}
                              style={styles.calendarRow}
                              onPress={() => pref && toggleCalendar(pref.id)}
                            >
                              <View style={styles.calendarLeft}>
                                <View
                                  style={[
                                    styles.calendarColorDot,
                                    { backgroundColor: cal.color || theme.link },
                                  ]}
                                />
                                <ThemedText style={styles.calendarName}>
                                  {cal.name}
                                </ThemedText>
                              </View>
                              <Feather
                                name={isEnabled ? "check-circle" : "circle"}
                                size={20}
                                color={isEnabled ? "#22C55E" : isDark ? "#666" : "#999"}
                              />
                            </Pressable>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Info Section */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark
                ? "rgba(59, 130, 246, 0.1)"
                : "rgba(59, 130, 246, 0.05)",
              borderColor: isDark
                ? "rgba(59, 130, 246, 0.3)"
                : "rgba(59, 130, 246, 0.2)",
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <Feather name="info" size={20} color="#3B82F6" />
            <ThemedText style={[styles.infoTitle, { color: "#3B82F6" }]}>
              About Calendar Sync
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.infoText, { color: isDark ? "#888" : "#666" }]}
          >
            Your calendar events are synced directly from Google Calendar. You can
            connect multiple accounts and choose which calendars to display. Changes
            sync automatically.
          </ThemedText>
        </View>
      </ScrollView>
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
  centeredContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
  },
  accountCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  accountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  accountStatus: {
    fontSize: 13,
  },
  accountActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.1)",
  },
  accountActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  accountActionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  calendarsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.1)",
  },
  calendarsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  calendarLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  calendarLoadingText: {
    fontSize: 14,
  },
  noCalendarsText: {
    fontSize: 14,
    paddingVertical: Spacing.md,
  },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  calendarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  calendarColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarName: {
    fontSize: 14,
    flex: 1,
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
