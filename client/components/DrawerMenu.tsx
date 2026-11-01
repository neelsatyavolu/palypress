import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FEATURES } from "@/config/features";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

// Legacy staff route hidden when the `staff` feature is off.
const STAFF_ROUTES = new Set(["StaffList"]);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

// Map route names to icons
const getRouteIcon = (route: string): keyof typeof Feather.glyphMap => {
  const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
    Home: "home",
    Staff: "users",
    AllStaff: "users",
    About: "info",
    Policies: "file-text",
    ContactUs: "mail",
    Corrections: "edit-3",
    Archives: "archive",
    Advertising: "dollar-sign",
    Sponsor: "award",
    Submit: "send",
    GeneralInfo: "info",
    Sponsorships: "award",
  };
  return iconMap[route] || "chevron-right";
};

export function DrawerMenu({ visible, onClose, onNavigate }: DrawerMenuProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { publication } = usePublication();
  const navigation = useNavigation();
  const route = useRoute();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const pendingRoute = useRef<string | null>(null);

  // Get current route name
  const currentRouteName = route.name;

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isModalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsModalVisible(false);
        if (pendingRoute.current) {
          const route = pendingRoute.current;
          pendingRoute.current = null;
          onNavigate(route);
        }
      });
    }
  }, [visible, slideAnim, overlayOpacity, isModalVisible, onNavigate]);

  const handleItemPress = (route: string) => {
    pendingRoute.current = route;
    onClose();
  };

  const handleClose = () => {
    pendingRoute.current = null;
    onClose();
  };

  if (!isModalVisible) return null;

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.overlayBackground, { opacity: overlayOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: isDark ? "#1a1a1a" : "#fff",
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.publicationBadge}>
              {publication.logoUrl ? (
                <View
                  style={[
                    styles.logoContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Image
                    source={{ uri: publication.logoUrl }}
                    style={styles.logo}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.logoContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Feather name="home" size={18} color={theme.text} />
                </View>
              )}
              <ThemedText style={styles.publicationName}>
                {publication.shortName}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* Divider */}
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

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {/* Home menu item - always show */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                currentRouteName === "Home" && styles.menuItemActive,
                currentRouteName === "Home" && {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : `${publication.primaryColor}15`,
                },
                pressed &&
                  !(currentRouteName === "Home") && {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                  },
              ]}
              onPress={() => handleItemPress("Home")}
            >
              <Feather
                name="home"
                size={20}
                color={
                  currentRouteName === "Home"
                    ? publication.primaryColor
                    : theme.text
                }
                style={styles.menuItemIcon}
              />
              <ThemedText
                style={[
                  styles.menuItemText,
                  currentRouteName === "Home" && {
                    color: publication.primaryColor,
                    fontWeight: "700",
                  },
                ]}
              >
                HOME
              </ThemedText>
            </Pressable>

            {/* Dynamic menu items */}
            {publication.menuItems
              .filter(
                (item) => FEATURES.staff || !STAFF_ROUTES.has(item.route),
              )
              .map((item) => {
              const isActive = currentRouteName === item.route;
              return (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                    isActive && {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : `${publication.primaryColor}15`,
                    },
                    pressed &&
                      !isActive && {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      },
                  ]}
                  onPress={() => handleItemPress(item.route)}
                >
                  <Feather
                    name={getRouteIcon(item.route)}
                    size={20}
                    color={isActive ? publication.primaryColor : theme.text}
                    style={styles.menuItemIcon}
                  />
                  <ThemedText
                    style={[
                      styles.menuItemText,
                      isActive && {
                        color: publication.primaryColor,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  publicationBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginRight: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 32,
    height: 32,
  },
  publicationName: {
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  menuItems: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
  },
  menuItemActive: {
    // Active state styling handled inline for color
  },
  menuItemIcon: {
    marginRight: Spacing.md,
    width: 20,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
