import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { currentStreak, last7Days, weekdayLetter } from "@/lib/habits";
import { dayKey } from "@/lib/calendar";
import { HABIT_COLORS, HABIT_ICONS, styles } from "@/styles/habits.styles";

interface Habit {
  _id: Id<"habits">;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  checkKeys: string[];
}

function HabitCard({
  habit,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  onToggle: (date: string) => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const streak = currentStreak(habit.checkKeys);
  const days = useMemo(() => last7Days(habit.checkKeys), [habit.checkKeys]);
  const today = dayKey(new Date());
  const doneToday = habit.checkKeys.includes(today);

  const handleDeletePress = () => {
    if (confirmingDelete) {
      onDelete();
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 2600);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconCircle, { backgroundColor: `${habit.color}26` }]}>
          <Text style={styles.iconText}>{habit.icon}</Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={styles.habitName} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.streakText}>
            {streak > 0 ? (
              <>
                <Text style={styles.streakHot}>🔥 {streak}</Text>
                <Text> day streak</Text>
              </>
            ) : (
              "No streak yet — start today"
            )}
          </Text>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: doneToday }}
          accessibilityLabel={`Mark ${habit.name} done today`}
          onPress={() => onToggle(today)}
          style={[styles.todayToggle, doneToday && styles.todayToggleDone]}
        >
          {doneToday ? <Text style={styles.todayToggleCheck}>✓</Text> : null}
        </Pressable>
      </View>

      <View style={styles.strip}>
        {days.map((d) => (
          <Pressable
            key={d.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: d.checked }}
            accessibilityLabel={`Mark ${habit.name} done on ${d.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`}
            onPress={() => onToggle(d.key)}
            style={styles.dayDotWrap}
          >
            <Text style={[styles.dayLetter, d.isToday && styles.dayLetterToday]}>
              {weekdayLetter(d.date)}
            </Text>
            <View
              style={[
                styles.dayDot,
                d.checked && [
                  styles.dayDotChecked,
                  { backgroundColor: habit.color },
                ],
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirmingDelete ? `Confirm delete ${habit.name}` : `Delete ${habit.name}`}
          onPress={handleDeletePress}
          style={styles.deleteButton}
        >
          <Text style={confirmingDelete ? styles.deleteConfirmText : styles.deleteText}>
            {confirmingDelete ? "Tap again to confirm" : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddHabitModal({
  visible,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string, color: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(HABIT_ICONS[5]);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const canSave = name.trim().length > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;
    onSave(name.trim(), icon, color);
    setName("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>New habit</Text>
          <TextInput
            accessibilityLabel="Habit name"
            style={styles.nameInput}
            placeholder="e.g. Morning run"
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoFocus
          />
          <Text style={styles.modalLabel}>ICON</Text>
          <View style={styles.optionRow}>
            {HABIT_ICONS.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="radio"
                accessibilityState={{ selected: icon === emoji }}
                accessibilityLabel={`Icon ${emoji}`}
                onPress={() => setIcon(emoji)}
                style={[styles.iconOption, icon === emoji && styles.iconOptionSelected]}
              >
                <Text style={styles.iconText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.modalLabel}>COLOR</Text>
          <View style={styles.optionRow}>
            {HABIT_COLORS.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ selected: color === c }}
                accessibilityLabel={`Color ${c}`}
                onPress={() => setColor(c)}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorOptionSelected,
                ]}
              />
            ))}
          </View>
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save habit"
              onPress={handleSave}
              disabled={!canSave}
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function HabitsView() {
  const { isDesktop } = useBreakpoints();
  const habits = useQuery(api.habits.list);
  const createHabit = useMutation(api.habits.create);
  const toggleCheck = useMutation(api.habits.toggleCheck);
  const removeHabit = useMutation(api.habits.removeHabit);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (name: string, icon: string, color: string) => {
    setSaving(true);
    try {
      await createHabit({ name, icon, color });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const totalStreaks = (habits ?? []).reduce(
    (sum, h) => sum + currentStreak(h.checkKeys),
    0,
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Habits</Text>
            <Text style={styles.headerSub}>
              {habits === undefined
                ? "Loading…"
                : habits.length === 0
                  ? "Your daily routine lives here"
                  : `${habits.length} habit${habits.length === 1 ? "" : "s"} · 🔥 ${totalStreaks} total streak days`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a new habit"
            onPress={() => setModalOpen(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ New habit</Text>
          </Pressable>
        </View>

        {habits === undefined ? (
          <>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </>
        ) : habits.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySub}>
              Dincharya means daily routine. Add your first habit — gym, reading,
              meditation — and check in every day to build a streak.
            </Text>
          </View>
        ) : (
          <View style={isDesktop ? styles.desktopGrid : undefined}>
            {habits.map((habit) => (
              <View key={habit._id} style={isDesktop ? styles.desktopCardWrap : undefined}>
                <HabitCard
                  habit={habit}
                  onToggle={(date) => toggleCheck({ habitId: habit._id, date })}
                  onDelete={() => removeHabit({ habitId: habit._id })}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AddHabitModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
      />
    </View>
  );
}
