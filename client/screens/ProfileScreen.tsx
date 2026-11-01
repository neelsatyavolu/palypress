import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import {
  useNavigation,
  CompositeNavigationProp,
} from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarScroll } from "@/hooks/useTabBarScroll";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DesktopShell } from "@/components/DesktopShell";
import { Spacing, BorderRadius } from "@/constants/theme";
import { trackProfileUpdated } from "@/lib/analytics";
import { apiRequest } from "@/lib/query-client";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

const isWeb = Platform.OS === "web";

export default function ProfileScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, signOut, updateProfile } = useAuth();
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<ProfileStackParamList>,
        BottomTabNavigationProp<MainTabParamList>
      >
    >();
  const { onScroll, scrollEventThrottle } = useTabBarScroll();

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Web hover states
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const [isSignOutHovered, setIsSignOutHovered] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const [isCancelHovered, setIsCancelHovered] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666";
  const inputBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.02)";

  // Web-specific colors
  const webCardBg = isDark ? "#191B1F" : "#FFFFFF";
  const webCardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const webMenuBg = isDark ? "#191B1F" : "#FFFFFF";
  const webMenuBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const webMenuShadow = isDark ? "none" : "0 1px 2px rgba(0,0,0,0.03)";
  const webMenuShadowHover = isDark
    ? "0 1px 4px rgba(255,255,255,0.04)"
    : "0 2px 8px rgba(0,0,0,0.06)";

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Display name cannot be empty");
      return;
    }

    setIsSaving(true);
    const result = await updateProfile(displayName.trim());
    setIsSaving(false);

    if (result.success) {
      trackProfileUpdated();
      setIsEditingName(false);
    } else {
      Alert.alert("Error", result.error || "Failed to update display name");
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.displayName || "");
    setIsEditingName(false);
  };

  const handleSubmitFeedback = async () => {
    const message = feedbackMessage.trim();
    if (!message) {
      setFeedbackStatus({
        type: "error",
        text: "Feedback cannot be empty.",
      });
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackStatus(null);

    try {
      await apiRequest("POST", "/api/feedback", { message });
      setFeedbackMessage("");
      setFeedbackStatus({
        type: "success",
        text: "Thanks. We got your feedback.",
      });
    } catch {
      setFeedbackStatus({
        type: "error",
        text: "Feedback could not be sent. Please try again.",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[styles.content, { paddingTop: headerHeight + Spacing.xl }]}
        >
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Build web-specific profile card style
  const profileCardWebStyle = isWeb
    ? ({
        backgroundColor: webCardBg,
        borderColor: webCardBorder,
        borderRadius: 18,
        boxShadow: isDark
          ? "0 2px 12px rgba(10,132,255,0.08)"
          : "0 2px 16px rgba(0,122,255,0.05), 0 1px 3px rgba(0,0,0,0.04)",
        background: isDark
          ? "linear-gradient(135deg, rgba(10,132,255,0.04) 0%, rgba(25,27,31,1) 100%)"
          : "linear-gradient(135deg, rgba(0,122,255,0.02) 0%, #FFFFFF 100%)",
      } as any)
    : { backgroundColor: cardBackgroundColor, borderColor };

  // Build web-specific avatar style
  const avatarWebStyle = isWeb
    ? ({
        borderWidth: 3,
        borderColor: "transparent",
        width: 88,
        height: 88,
        borderRadius: 44,
        background: isDark
          ? "linear-gradient(135deg, #0A84FF, #6366F1)"
          : "linear-gradient(135deg, #007AFF, #6366F1)",
        boxShadow: isDark
          ? "0 0 0 4px rgba(10,132,255,0.2), 0 4px 12px rgba(10,132,255,0.15)"
          : "0 0 0 4px rgba(0,122,255,0.12), 0 4px 12px rgba(0,122,255,0.1)",
      } as any)
    : {};

  // Helper for menu item styles on web
  const getMenuItemWebStyle = (key: string, isHovered: boolean) => {
    if (!isWeb) return { backgroundColor: cardBackgroundColor, borderColor };
    return {
      backgroundColor: webMenuBg,
      borderColor: webMenuBorder,
      borderRadius: 12,
      cursor: "pointer" as const,
      transition: "all 0.15s ease",
      boxShadow: isHovered ? webMenuShadowHover : webMenuShadow,
    } as any;
  };

  return (
    <ThemedView style={styles.container}>
      <DesktopShell>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.xl,
              paddingBottom: tabBarHeight + Spacing["2xl"],
            },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {/* Profile Card */}
          <View
            style={[
              styles.profileCard,
              isWeb
                ? profileCardWebStyle
                : { backgroundColor: cardBackgroundColor, borderColor },
            ]}
          >
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.link },
                avatarWebStyle,
              ]}
            >
              <Feather name="user" size={40} color="#fff" />
            </View>

            {isEditingName ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: inputBackgroundColor,
                      borderColor,
                      color: theme.text,
                    },
                    isWeb
                      ? ({
                          borderRadius: 10,
                          outlineColor: theme.link,
                          outlineWidth: 2,
                          outlineOffset: -1,
                        } as any)
                      : {},
                  ]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter display name"
                  placeholderTextColor={secondaryTextColor}
                  autoFocus
                  maxLength={50}
                />
                <View style={styles.editButtons}>
                  {/* Cancel Button */}
                  {isWeb ? (
                    <div
                      onMouseEnter={() => setIsCancelHovered(true)}
                      onMouseLeave={() => setIsCancelHovered(false)}
                    >
                      <Pressable
                        style={[
                          styles.editButton,
                          styles.cancelButton,
                          { borderColor },
                          {
                            borderRadius: 10,
                            cursor: "pointer" as any,
                            transition: "all 0.15s ease",
                            opacity: isCancelHovered ? 0.8 : 1,
                          } as any,
                        ]}
                        onPress={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <ThemedText style={styles.editButtonText}>
                          Cancel
                        </ThemedText>
                      </Pressable>
                    </div>
                  ) : (
                    <Pressable
                      style={[
                        styles.editButton,
                        styles.cancelButton,
                        { borderColor },
                      ]}
                      onPress={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <ThemedText style={styles.editButtonText}>
                        Cancel
                      </ThemedText>
                    </Pressable>
                  )}

                  {/* Save Button */}
                  {isWeb ? (
                    <div
                      onMouseEnter={() => setIsSaveHovered(true)}
                      onMouseLeave={() => setIsSaveHovered(false)}
                    >
                      <Pressable
                        style={[
                          styles.editButton,
                          styles.saveButton,
                          {
                            borderRadius: 10,
                            cursor: "pointer" as any,
                            transition: "all 0.15s ease",
                            background:
                              "linear-gradient(135deg, #007AFF, #6366F1)",
                            opacity: isSaveHovered ? 0.9 : 1,
                          } as any,
                        ]}
                        onPress={handleSaveDisplayName}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <ThemedText
                            style={[styles.editButtonText, { color: "#fff" }]}
                          >
                            Save
                          </ThemedText>
                        )}
                      </Pressable>
                    </div>
                  ) : (
                    <Pressable
                      style={[
                        styles.editButton,
                        styles.saveButton,
                        { backgroundColor: theme.link },
                      ]}
                      onPress={handleSaveDisplayName}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ThemedText
                          style={[styles.editButtonText, { color: "#fff" }]}
                        >
                          Save
                        </ThemedText>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.nameContainer}
                onPress={() => setIsEditingName(true)}
              >
                <ThemedText style={styles.displayName}>
                  {user.displayName || "Add display name"}
                </ThemedText>
                <Feather
                  name="edit-2"
                  size={16}
                  color={theme.link}
                  style={styles.editIcon}
                />
              </Pressable>
            )}

            <ThemedText style={[styles.email, { color: secondaryTextColor }]}>
              {user.email}
            </ThemedText>

            <View style={styles.statusBadge}>
              <Feather
                name="check-circle"
                size={14}
                color={theme.link}
                style={{ marginRight: 4 }}
              />
              <ThemedText style={[styles.statusText, { color: theme.link }]}>
                Verified
              </ThemedText>
            </View>
          </View>

          {/* Menu Items Section */}
          <View style={styles.section}>
            {[
              {
                key: "appearance",
                icon: "smartphone" as const,
                label: "Appearance",
                onPress: () => navigation.navigate("AppearanceSettings"),
              },
              {
                key: "saved",
                icon: "bookmark" as const,
                label: "Saved Articles",
                onPress: () => navigation.navigate("SavedArticles"),
              },
              {
                key: "comments",
                icon: "message-circle" as const,
                label: "My Comments",
                onPress: () => navigation.navigate("MyComments"),
              },
              {
                key: "notifications",
                icon: "bell" as const,
                label: "Notification Preferences",
                onPress: () => navigation.navigate("NotificationSettings"),
              },
              {
                key: "security",
                icon: "shield" as const,
                label: "Security",
                onPress: () => navigation.navigate("SecuritySettings"),
              },
              {
                key: "blocked",
                icon: "slash" as const,
                label: "Blocked Users",
                onPress: () => navigation.navigate("BlockedUsers"),
              },
              {
                key: "terms",
                icon: "file-text" as const,
                label: "Terms of Service",
                onPress: () =>
                  navigation.navigate("Legal", { document: "terms" }),
              },
              {
                key: "privacy",
                icon: "lock" as const,
                label: "Privacy Policy",
                onPress: () =>
                  navigation.navigate("Legal", { document: "privacy" }),
              },
            ].map((item) => {
              const isHovered = hoveredMenuItem === item.key;
              const menuStyle = getMenuItemWebStyle(item.key, isHovered);

              const pressable = (
                <Pressable
                  key={item.key}
                  style={[
                    styles.menuItem,
                    isWeb
                      ? menuStyle
                      : { backgroundColor: cardBackgroundColor, borderColor },
                  ]}
                  onPress={item.onPress}
                >
                  <Feather name={item.icon} size={20} color={theme.text} />
                  <ThemedText style={styles.menuText}>{item.label}</ThemedText>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={secondaryTextColor}
                  />
                </Pressable>
              );

              if (isWeb) {
                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredMenuItem(item.key)}
                    onMouseLeave={() => setHoveredMenuItem(null)}
                  >
                    {pressable}
                  </div>
                );
              }

              return pressable;
            })}
          </View>

          {/* Feedback Section */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionTitle, { color: secondaryTextColor }]}
            >
              FEEDBACK
            </ThemedText>
            <View
              style={[
                styles.feedbackPanel,
                isWeb
                  ? {
                      backgroundColor: webMenuBg,
                      borderColor: webMenuBorder,
                      boxShadow: webMenuShadow,
                    }
                  : { backgroundColor: cardBackgroundColor, borderColor },
              ]}
            >
              <View style={styles.feedbackHeader}>
                <Feather name="message-square" size={20} color={theme.text} />
                <ThemedText style={styles.menuText}>Feedback</ThemedText>
              </View>
              <TextInput
                style={[
                  styles.feedbackInput,
                  {
                    backgroundColor: inputBackgroundColor,
                    borderColor,
                    color: theme.text,
                  },
                  isWeb
                    ? ({
                        outlineColor: theme.link,
                        outlineWidth: 2,
                        outlineOffset: -1,
                      } as any)
                    : {},
                ]}
                value={feedbackMessage}
                onChangeText={(text) => {
                  setFeedbackMessage(text);
                  if (feedbackStatus) setFeedbackStatus(null);
                }}
                placeholder="What should we improve?"
                placeholderTextColor={secondaryTextColor}
                multiline
                maxLength={2000}
                editable={!isSubmittingFeedback}
                textAlignVertical="top"
              />
              {feedbackStatus ? (
                <ThemedText
                  style={[
                    styles.feedbackStatus,
                    {
                      color:
                        feedbackStatus.type === "success"
                          ? theme.link
                          : "#dc3545",
                    },
                  ]}
                  selectable
                >
                  {feedbackStatus.text}
                </ThemedText>
              ) : null}
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.feedbackButton,
                  {
                    backgroundColor: theme.link,
                    opacity: isSubmittingFeedback ? 0.7 : 1,
                  },
                  isWeb
                    ? ({
                        cursor: isSubmittingFeedback ? "default" : "pointer",
                        transition: "opacity 0.15s ease",
                      } as any)
                    : {},
                ]}
                onPress={handleSubmitFeedback}
                disabled={isSubmittingFeedback}
              >
                {isSubmittingFeedback ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <ThemedText
                      style={[styles.feedbackButtonText, { color: "#fff" }]}
                    >
                      Send Feedback
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Sign Out Button */}
          {isWeb ? (
            <div
              onMouseEnter={() => setIsSignOutHovered(true)}
              onMouseLeave={() => setIsSignOutHovered(false)}
            >
              <Pressable
                style={[
                  styles.signOutButton,
                  {
                    borderColor: "#dc3545",
                    borderRadius: 12,
                    cursor: "pointer" as any,
                    transition: "all 0.15s ease",
                    backgroundColor: isSignOutHovered
                      ? "rgba(220, 53, 69, 0.08)"
                      : "transparent",
                  } as any,
                ]}
                onPress={handleSignOut}
              >
                <Feather name="log-out" size={20} color="#dc3545" />
                <ThemedText style={[styles.signOutText, { color: "#dc3545" }]}>
                  Sign Out
                </ThemedText>
              </Pressable>
            </div>
          ) : (
            <Pressable
              style={[styles.signOutButton, { borderColor: "#dc3545" }]}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={20} color="#dc3545" />
              <ThemedText style={[styles.signOutText, { color: "#dc3545" }]}>
                Sign Out
              </ThemedText>
            </Pressable>
          )}
        </Animated.ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  profileCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "600",
  },
  editIcon: {
    marginLeft: Spacing.sm,
  },
  editNameContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  nameInput: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  editButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  editButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  email: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  feedbackPanel: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  feedbackInput: {
    minHeight: 110,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  feedbackStatus: {
    fontSize: 13,
    fontWeight: "500",
  },
  feedbackButton: {
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  comingSoon: {
    fontSize: 12,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
});
