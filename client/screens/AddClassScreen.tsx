import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { ScheduleStackParamList } from "@/navigation/ScheduleStackNavigator";

type AddClassNavigationProp = NativeStackNavigationProp<
  ScheduleStackParamList,
  "AddClass"
>;

interface StaffMember {
  name: string;
  email: string;
  title: string;
}

const PERIODS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function AddClassScreen() {
  const navigation = useNavigation<AddClassNavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [isPrep, setIsPrep] = useState(false);
  const [className, setClassName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Teacher autocomplete state
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);
  const [teacherSuggestions, setTeacherSuggestions] = useState<StaffMember[]>([]);
  const [allTeachers, setAllTeachers] = useState<StaffMember[]>([]);

  // Fetch teachers on mount
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch(`${getApiUrl()}api/staff-directory/teachers`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAllTeachers(data);
        }
      } catch (err) {
        console.error("Error fetching teachers:", err);
      }
    };
    fetchTeachers();
  }, []);

  // Filter teachers based on input
  useEffect(() => {
    if (!teacherName.trim() || teacherName.trim().length < 2) {
      setTeacherSuggestions([]);
      setShowTeacherSuggestions(false);
      return;
    }

    const lowerQuery = teacherName.toLowerCase().trim();
    const filtered = allTeachers.filter((teacher) =>
      teacher.name.toLowerCase().includes(lowerQuery)
    );
    setTeacherSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
    setShowTeacherSuggestions(filtered.length > 0);
  }, [teacherName, allTeachers]);

  const handleSelectTeacher = useCallback((teacher: StaffMember) => {
    setTeacherName(teacher.name);
    setShowTeacherSuggestions(false);
  }, []);

  const canSave =
    selectedPeriod !== null && (isPrep || className.trim().length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        period: selectedPeriod,
        className: isPrep ? "Prep" : className.trim(),
      };
      if (!isPrep) {
        if (teacherName.trim()) body.teacherName = teacherName.trim();
        if (roomNumber.trim()) body.roomNumber = roomNumber.trim();
      }

      await apiRequest("POST", "/api/classes", body);
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputBg = isDark ? "#2A2C2E" : "#fff";
  const inputBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const inputColor = isDark ? "#ECEDEE" : "#11181C";
  const placeholderColor = isDark
    ? "rgba(255,255,255,0.4)"
    : "rgba(0,0,0,0.4)";

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.lg,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Period Selector */}
          <ThemedText style={styles.label}>Period</ThemedText>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const selected = selectedPeriod === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setSelectedPeriod(p)}
                  style={[
                    styles.periodChip,
                    {
                      backgroundColor: selected
                        ? theme.link
                        : isDark
                          ? "#2A2C2E"
                          : "#f0f0f0",
                      borderColor: selected
                        ? theme.link
                        : isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(0,0,0,0.12)",
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.periodChipText,
                      { color: selected ? "#fff" : inputColor },
                    ]}
                  >
                    {p}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Prep Toggle */}
          <Pressable
            onPress={() => setIsPrep(!isPrep)}
            style={[
              styles.prepRow,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                borderColor: inputBorder,
              },
            ]}
          >
            <View style={styles.prepLeft}>
              <ThemedText style={styles.prepLabel}>Prep Period</ThemedText>
              <ThemedText
                style={[
                  styles.prepSubLabel,
                  { color: isDark ? "#888" : "#666" },
                ]}
              >
                No class, teacher, or room needed
              </ThemedText>
            </View>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: isPrep ? theme.link : inputBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: isPrep ? 20 : 0 }] },
                ]}
              />
            </View>
          </Pressable>

          {/* Class / Teacher / Room — hidden when Prep */}
          {!isPrep && (
            <>
              <ThemedText style={styles.label}>Class Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: inputColor,
                  },
                ]}
                value={className}
                onChangeText={setClassName}
                placeholder="e.g. AP Chemistry"
                placeholderTextColor={placeholderColor}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <ThemedText style={styles.label}>Teacher</ThemedText>
              <View style={styles.teacherInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: inputBorder,
                      color: inputColor,
                    },
                  ]}
                  value={teacherName}
                  onChangeText={setTeacherName}
                  placeholder="e.g. Mr. Smith"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => {
                    if (teacherSuggestions.length > 0) {
                      setShowTeacherSuggestions(true);
                    }
                  }}
                />
                {showTeacherSuggestions && teacherSuggestions.length > 0 && (
                  <View
                    style={[
                      styles.suggestionsContainer,
                      {
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                      },
                    ]}
                  >
                    <FlatList
                      data={teacherSuggestions}
                      keyExtractor={(item) => item.email}
                      renderItem={({ item }) => (
                        <Pressable
                          onPress={() => handleSelectTeacher(item)}
                          style={[
                            styles.suggestionItem,
                            {
                              borderBottomColor: inputBorder,
                            },
                          ]}
                        >
                          <View style={styles.suggestionContent}>
                            <ThemedText style={styles.suggestionName}>
                              {item.name}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.suggestionTitle,
                                { color: isDark ? "#888" : "#666" },
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </ThemedText>
                          </View>
                          <Feather
                            name="check-circle"
                            size={18}
                            color={theme.link}
                          />
                        </Pressable>
                      )}
                      scrollEnabled={false}
                      nestedScrollEnabled={true}
                    />
                  </View>
                )}
              </View>

              <ThemedText style={styles.label}>Room Number</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: inputBorder,
                    color: inputColor,
                  },
                ]}
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="e.g. 204"
                placeholderTextColor={placeholderColor}
                autoCorrect={false}
                keyboardType="default"
              />
            </>
          )}
        </ScrollView>

        {/* Save button pinned to bottom */}
        <View
          style={[
            styles.saveBar,
            {
              backgroundColor: isDark ? "#1F2123" : "#fff",
              borderTopColor: inputBorder,
              paddingBottom: tabBarHeight + Spacing.md,
            },
          ]}
        >
          <Pressable
            onPress={handleSave}
            disabled={!canSave || isLoading}
            style={[
              styles.saveButton,
              {
                backgroundColor: canSave && !isLoading ? theme.link : "#999",
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  periodRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  periodChip: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  prepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  prepLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  prepLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  prepSubLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  saveBar: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  teacherInputContainer: {
    position: "relative",
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  suggestionTitle: {
    fontSize: 12,
  },
});
