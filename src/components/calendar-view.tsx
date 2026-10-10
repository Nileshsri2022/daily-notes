import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Doc } from "../../convex/_generated/dataModel";
import { styles } from "@/styles/calendar.styles";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import {
  addMonths,
  dayKey,
  dayLabel,
  getMonthGrid,
  groupNotesByDay,
  monthLabel,
  timeLabel,
} from "@/lib/calendar";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function dotsFor(count: number): number {
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

export function CalendarView({
  notes,
}: {
  notes: Doc<"notes">[] | undefined;
}) {
  const router = useRouter();
  const { isDesktop } = useBreakpoints();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState(() => dayKey(now));

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const byDay = useMemo(() => groupNotesByDay(notes ?? []), [notes]);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  const selectedNotes = useMemo(() => {
    const list = byDay.get(selectedKey) ?? [];
    return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [byDay, selectedKey]);

  const changeMonth = (delta: number) => {
    const next = addMonths(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const jumpToToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedKey(dayKey(t));
  };

  const renderHeader = () => (
    <View style={styles.monthHeader}>
      <Text style={styles.monthTitle}>{monthLabel(year, month)}</Text>
      <View style={styles.monthNav}>
        <Pressable
          onPress={jumpToToday}
          style={styles.todayPill}
          accessibilityRole="button"
          accessibilityLabel="Go to today"
        >
          <Text style={styles.todayPillText}>Today</Text>
        </Pressable>
        <Pressable
          onPress={() => changeMonth(-1)}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => changeMonth(1)}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderGrid = () => (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((cell) => {
          const count = byDay.get(cell.key)?.length ?? 0;
          const isSelected = cell.key === selectedKey;
          return (
            <Pressable
              key={cell.key}
              onPress={() => setSelectedKey(cell.key)}
              disabled={!cell.inMonth}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(cell.date)}, ${count} ${count === 1 ? "note" : "notes"}`}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                cell.isToday && !isSelected && styles.dayCellToday,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  !cell.inMonth && styles.dayNumberDim,
                  isSelected && styles.dayNumberSelected,
                  cell.isToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {cell.date.getDate()}
              </Text>
              <View style={styles.dotsRow}>
                {count > 0
                  ? Array.from({ length: dotsFor(count) }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dot, isSelected && styles.dotSelected]}
                      />
                    ))
                  : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderDayPanel = () => (
    <View style={styles.dayPanel}>
      <Text style={styles.dayPanelHeader}>
        {dayLabel(selectedDate)} · {selectedNotes.length}{" "}
        {selectedNotes.length === 1 ? "note" : "notes"}
      </Text>
      {selectedNotes.length === 0 ? (
        <Text style={styles.emptyDayText}>No entries this day.</Text>
      ) : (
        selectedNotes.map((note) => (
          <Pressable
            key={note._id}
            onPress={() =>
              router.push({ pathname: "/note/[id]", params: { id: note._id } })
            }
            style={({ pressed }) => [
              styles.noteRow,
              pressed && styles.noteRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Open note: ${note.title || "untitled"}`}
          >
            <Text style={styles.noteRowTitle} numberOfLines={1}>
              {note.title.trim() === "" ? "(untitled)" : note.title}
            </Text>
            <Text style={styles.noteRowMeta}>{timeLabel(note.updatedAt)}</Text>
          </Pressable>
        ))
      )}
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopLayout}>
        <View style={styles.gridColumn}>
          {renderHeader()}
          {renderGrid()}
        </View>
        <ScrollView
          style={styles.listColumn}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {renderDayPanel()}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {renderHeader()}
      {renderGrid()}
      {renderDayPanel()}
    </ScrollView>
  );
}
