import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

type FilterTab = "all" | "pending" | "completed";

export default function TodoListScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark, theme } = useTheme();
  const { isAuthenticated } = useAuth();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");

  // New todo form state
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Edit state
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const inputBgColor = isDark
    ? "rgba(255, 255, 255, 0.06)"
    : "rgba(0, 0, 0, 0.04)";

  const fetchTodos = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`${getApiUrl()}api/todos`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
      }
    } catch (err) {
      console.error("Error fetching todos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchTodos();
    }, [fetchTodos])
  );

  const createTodo = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: newTitle.trim(),
        priority: newPriority,
      };
      if (newDueDate) {
        body.dueDate = newDueDate.toISOString();
      }
      const res = await apiRequest("POST", "/api/todos", body);
      const todo = await res.json();
      setTodos((prev) => [todo, ...prev]);
      setNewTitle("");
      setNewDueDate(null);
      setNewPriority("medium");
      setShowForm(false);
    } catch (err) {
      console.error("Error creating todo:", err);
      Alert.alert("Error", "Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const res = await apiRequest("PATCH", `/api/todos/${id}/toggle`);
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      console.error("Error toggling todo:", err);
    }
  };

  const deleteTodo = async (id: string) => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest("DELETE", `/api/todos/${id}`);
            setTodos((prev) => prev.filter((t) => t.id !== id));
          } catch (err) {
            console.error("Error deleting todo:", err);
          }
        },
      },
    ]);
  };

  const startEditing = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate) : null);
    setEditPriority(todo.priority as "low" | "medium" | "high");
  };

  const saveEdit = async () => {
    if (!editingTodo || !editTitle.trim()) return;
    try {
      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        priority: editPriority,
      };
      if (editDueDate) {
        body.dueDate = editDueDate.toISOString();
      } else {
        body.dueDate = null;
      }
      const res = await apiRequest("PUT", `/api/todos/${editingTodo.id}`, body);
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === editingTodo.id ? updated : t)));
      setEditingTodo(null);
    } catch (err) {
      console.error("Error updating todo:", err);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "pending") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "#EF4444";
      case "medium": return "#F59E0B";
      case "low": return "#10B981";
      default: return "#6B7280";
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const current = newDueDate || new Date();
      selectedDate.setHours(current.getHours(), current.getMinutes());
      setNewDueDate(selectedDate);
      if (Platform.OS === "android") {
        setShowTimePicker(true);
      }
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedDate) {
      setNewDueDate(selectedDate);
    }
  };

  const onEditDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEditDatePicker(false);
    if (selectedDate) {
      const current = editDueDate || new Date();
      selectedDate.setHours(current.getHours(), current.getMinutes());
      setEditDueDate(selectedDate);
      if (Platform.OS === "android") {
        setShowEditTimePicker(true);
      }
    }
  };

  const onEditTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEditTimePicker(false);
    if (selectedDate) {
      setEditDueDate(selectedDate);
    }
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filter === tab.key
                    ? theme.link
                    : cardBackgroundColor,
                  borderColor: filter === tab.key ? theme.link : borderColor,
                },
              ]}
              onPress={() => setFilter(tab.key)}
            >
              <ThemedText
                style={[
                  styles.filterTabText,
                  { color: filter === tab.key ? "#fff" : theme.text },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Add Button */}
        {!showForm && !editingTodo && (
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.link }]}
            onPress={() => setShowForm(true)}
          >
            <Feather name="plus" size={20} color="#fff" />
            <ThemedText style={styles.addButtonText}>Add Task</ThemedText>
          </Pressable>
        )}

        {/* New Todo Form */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBgColor, color: theme.text, borderColor }]}
              placeholder="What do you need to do?"
              placeholderTextColor={isDark ? "#666" : "#999"}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            {/* Priority Selector */}
            <View style={styles.priorityRow}>
              <ThemedText style={styles.fieldLabel}>Priority:</ThemedText>
              {(["low", "medium", "high"] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: newPriority === p
                        ? getPriorityColor(p) + "20"
                        : "transparent",
                      borderColor: newPriority === p
                        ? getPriorityColor(p)
                        : borderColor,
                    },
                  ]}
                  onPress={() => setNewPriority(p)}
                >
                  <ThemedText
                    style={[
                      styles.priorityChipText,
                      {
                        color: newPriority === p
                          ? getPriorityColor(p)
                          : isDark ? "#999" : "#666",
                      },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Due Date */}
            <Pressable
              style={[styles.dateButton, { backgroundColor: inputBgColor, borderColor }]}
              onPress={() => {
                if (!newDueDate) setNewDueDate(new Date());
                setShowDatePicker(true);
              }}
            >
              <Feather name="calendar" size={16} color={isDark ? "#999" : "#666"} />
              <ThemedText style={[styles.dateButtonText, { color: newDueDate ? theme.text : (isDark ? "#666" : "#999") }]}>
                {newDueDate ? formatDueDate(newDueDate.toISOString()) : "Add due date (optional)"}
              </ThemedText>
              {newDueDate && (
                <Pressable onPress={() => setNewDueDate(null)}>
                  <Feather name="x" size={16} color={isDark ? "#666" : "#999"} />
                </Pressable>
              )}
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={newDueDate || new Date()}
                mode="date"
                onChange={onDateChange}
                display={Platform.OS === "ios" ? "inline" : "default"}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={newDueDate || new Date()}
                mode="time"
                onChange={onTimeChange}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}

            <View style={styles.formActions}>
              <Pressable
                style={[styles.formButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                onPress={() => {
                  setShowForm(false);
                  setNewTitle("");
                  setNewDueDate(null);
                  setNewPriority("medium");
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.formButton, { backgroundColor: theme.link, opacity: newTitle.trim() ? 1 : 0.5 }]}
                onPress={createTodo}
                disabled={!newTitle.trim() || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.createButtonText}>Create</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Edit Form */}
        {editingTodo && (
          <View style={[styles.formCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
            <ThemedText style={styles.editHeader}>Edit Task</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBgColor, color: theme.text, borderColor }]}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />

            <View style={styles.priorityRow}>
              <ThemedText style={styles.fieldLabel}>Priority:</ThemedText>
              {(["low", "medium", "high"] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: editPriority === p
                        ? getPriorityColor(p) + "20"
                        : "transparent",
                      borderColor: editPriority === p
                        ? getPriorityColor(p)
                        : borderColor,
                    },
                  ]}
                  onPress={() => setEditPriority(p)}
                >
                  <ThemedText
                    style={[
                      styles.priorityChipText,
                      {
                        color: editPriority === p
                          ? getPriorityColor(p)
                          : isDark ? "#999" : "#666",
                      },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.dateButton, { backgroundColor: inputBgColor, borderColor }]}
              onPress={() => {
                if (!editDueDate) setEditDueDate(new Date());
                setShowEditDatePicker(true);
              }}
            >
              <Feather name="calendar" size={16} color={isDark ? "#999" : "#666"} />
              <ThemedText style={[styles.dateButtonText, { color: editDueDate ? theme.text : (isDark ? "#666" : "#999") }]}>
                {editDueDate ? formatDueDate(editDueDate.toISOString()) : "Add due date (optional)"}
              </ThemedText>
              {editDueDate && (
                <Pressable onPress={() => setEditDueDate(null)}>
                  <Feather name="x" size={16} color={isDark ? "#666" : "#999"} />
                </Pressable>
              )}
            </Pressable>

            {showEditDatePicker && (
              <DateTimePicker
                value={editDueDate || new Date()}
                mode="date"
                onChange={onEditDateChange}
                display={Platform.OS === "ios" ? "inline" : "default"}
              />
            )}
            {showEditTimePicker && (
              <DateTimePicker
                value={editDueDate || new Date()}
                mode="time"
                onChange={onEditTimeChange}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}

            <View style={styles.formActions}>
              <Pressable
                style={[styles.formButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                onPress={() => {
                  setEditingTodo(null);
                  setShowEditDatePicker(false);
                  setShowEditTimePicker(false);
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.formButton, { backgroundColor: theme.link, opacity: editTitle.trim() ? 1 : 0.5 }]}
                onPress={saveEdit}
                disabled={!editTitle.trim()}
              >
                <ThemedText style={styles.createButtonText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Todo List */}
        {isLoading ? (
          <ActivityIndicator size="large" style={{ marginTop: Spacing["3xl"] }} />
        ) : filteredTodos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather
              name={filter === "completed" ? "check-circle" : "check-square"}
              size={48}
              color={isDark ? "#444" : "#ccc"}
            />
            <ThemedText style={[styles.emptyText, { color: isDark ? "#666" : "#999" }]}>
              {filter === "pending"
                ? "No pending tasks"
                : filter === "completed"
                ? "No completed tasks"
                : "No tasks yet"}
            </ThemedText>
            {filter === "pending" && (
              <ThemedText style={[styles.emptySubtext, { color: isDark ? "#555" : "#aaa" }]}>
                Tap "Add Task" to create one
              </ThemedText>
            )}
          </View>
        ) : (
          <View style={styles.todoList}>
            {filteredTodos.map((todo) => (
              <Pressable
                key={todo.id}
                style={[
                  styles.todoCard,
                  { backgroundColor: cardBackgroundColor, borderColor },
                ]}
                onPress={() => toggleTodo(todo.id)}
                onLongPress={() => startEditing(todo)}
              >
                <View style={styles.todoRow}>
                  <Pressable onPress={() => toggleTodo(todo.id)} style={styles.checkboxArea}>
                    <Feather
                      name={todo.completed ? "check-circle" : "circle"}
                      size={22}
                      color={todo.completed ? "#22C55E" : isDark ? "#666" : "#999"}
                    />
                  </Pressable>
                  <View style={styles.todoContent}>
                    <ThemedText
                      style={[
                        styles.todoTitle,
                        todo.completed && styles.todoCompleted,
                        todo.completed && { color: isDark ? "#666" : "#999" },
                      ]}
                      numberOfLines={2}
                    >
                      {todo.title}
                    </ThemedText>
                    <View style={styles.todoMeta}>
                      {todo.dueDate && (
                        <View style={styles.dueDateRow}>
                          <Feather
                            name="clock"
                            size={12}
                            color={
                              !todo.completed && isOverdue(todo.dueDate)
                                ? "#EF4444"
                                : isDark ? "#888" : "#888"
                            }
                          />
                          <ThemedText
                            style={[
                              styles.dueDateText,
                              {
                                color: !todo.completed && isOverdue(todo.dueDate)
                                  ? "#EF4444"
                                  : isDark ? "#888" : "#888",
                              },
                            ]}
                          >
                            {formatDueDate(todo.dueDate)}
                          </ThemedText>
                        </View>
                      )}
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: getPriorityColor(todo.priority) + "20" },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.priorityBadgeText,
                            { color: getPriorityColor(todo.priority) },
                          ]}
                        >
                          {todo.priority}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.todoActions}>
                    <Pressable onPress={() => startEditing(todo)} style={styles.actionButton}>
                      <Feather name="edit-2" size={16} color={isDark ? "#666" : "#999"} />
                    </Pressable>
                    <Pressable onPress={() => deleteTodo(todo.id)} style={styles.actionButton}>
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  formCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  editHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: Spacing.xs,
  },
  priorityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 14,
    flex: 1,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  formButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  todoList: {
    gap: Spacing.sm,
  },
  todoCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  checkboxArea: {
    paddingTop: 2,
  },
  todoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  todoCompleted: {
    textDecorationLine: "line-through",
  },
  todoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  todoActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: 2,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
  },
});
