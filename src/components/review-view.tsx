import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  addWeeks,
  weekDayKeys,
  weekKeyFor,
  weekLabel,
} from "@/lib/review";
import { weekdayLetter } from "@/lib/habits";
import { dayKey } from "@/lib/calendar";
import { MOOD_COLORS, styles } from "@/styles/review.styles";

interface DigestDoc {
  weekKey: string;
  generatedAt: number;
  model: string;
  stats: {
    notesWritten: number;
    tasksDone: number;
    tasksPending: number;
    pendingTasks: string[];
    totalSpent: number;
    currency: string;
    topCategories: { category: string; amount: number }[];
    habitsChecked: number;
    activeStreaks: number;
  };
  ai: {
    summary: string;
    moodByDay: { date: string; score: number; label: string }[];
    keyMoments: string[];
  };
}

function cleanError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/Uncaught Error:\s*([^\n\r]+)/);
  const msg = match ? match[1].trim() : raw.replace(/^\[CONVEX[^\]]*\]\s*/, "");
  return msg.split("\n")[0].trim().slice(0, 220) || "Something went wrong.";
}

function money(currency: string, amount: number): string {
  return `${currency}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MoodTrend({ digest }: { digest: DigestDoc }) {
  const todayKey = dayKey(new Date());
  const dates = weekDayKeys(digest.weekKey);
  const byDate = new Map(digest.ai.moodByDay.map((m) => [m.date, m]));
  const [selected, setSelected] = useState<string>(
    dates.includes(todayKey) ? todayKey : dates[0],
  );
  const selectedMood = byDate.get(selected);

  return (
    <View>
      <Text style={styles.sectionLabel}>MOOD TREND</Text>
      <View style={styles.moodRow}>
        {dates.map((date) => {
          const mood = byDate.get(date);
          const score = mood?.score ?? 3;
          const d = new Date(
            Number(date.slice(0, 4)),
            Number(date.slice(5, 7)) - 1,
            Number(date.slice(8, 10)),
          );
          const isSelected = date === selected;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`${d.toLocaleDateString(undefined, { weekday: "long" })}: ${mood?.label ?? "quiet"}, ${score} out of 5`}
              onPress={() => setSelected(date)}
              style={styles.moodCol}
            >
              <View
                style={[
                  styles.moodBar,
                  {
                    height: 14 + (score - 1) * 22,
                    backgroundColor: MOOD_COLORS[score - 1],
                  },
                  isSelected && styles.moodBarSelected,
                ]}
              />
              <Text style={[styles.moodDay, isSelected && styles.moodDaySelected]}>
                {weekdayLetter(d)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.moodLabel}>
        {selectedMood
          ? `${new Date(
              Number(selected.slice(0, 4)),
              Number(selected.slice(5, 7)) - 1,
              Number(selected.slice(8, 10)),
            ).toLocaleDateString(undefined, { weekday: "long" })} — ${selectedMood.label}`
          : " "}
      </Text>
    </View>
  );
}

export function ReviewView() {
  const currentKey = weekKeyFor(new Date());
  const [weekKey, setWeekKey] = useState(currentKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digest = useQuery(api.review.getDigest, { weekKey }) as
    | DigestDoc
    | null
    | undefined;
  const generate = useAction(api.review.generateDigest);

  const isCurrentWeek = weekKey === currentKey;
  const canGoNext = weekKey < currentKey;
  const isSunday = new Date().getDay() === 0;

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await generate({
        weekKey,
        apiKey: process.env.EXPO_PUBLIC_AI_API_KEY,
        baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL,
      });
      if (result.empty) {
        setError(
          "Nothing to review yet — no notes, expenses, or habit check-ins this week.",
        );
      }
      // Otherwise the getDigest subscription picks up the saved digest.
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(false);
    }
  };

  const stats = digest?.stats;
  const maxCat = stats?.topCategories[0]?.amount ?? 1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.weekNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={() => setWeekKey((k) => addWeeks(k, -1))}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <View style={styles.weekTitleWrap}>
            <Text style={styles.weekTitle}>{weekLabel(weekKey)}</Text>
            <Text style={styles.weekSub}>
              {isCurrentWeek ? "This week" : "Past week"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            disabled={!canGoNext}
            onPress={() => setWeekKey((k) => addWeeks(k, 1))}
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
          >
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>

        {digest === undefined ? (
          <View style={styles.skeletonCard} />
        ) : digest === null ? (
          <View
            style={[
              styles.ctaCard,
              isSunday && isCurrentWeek && styles.ctaHighlight,
            ]}
          >
            <Text style={styles.ctaIcon}>📰</Text>
            <Text style={styles.ctaTitle}>
              {isSunday && isCurrentWeek
                ? "Your week in review is ready ✨"
                : "No review yet"}
            </Text>
            <Text style={styles.ctaSub}>
              {isSunday && isCurrentWeek
                ? "It's Sunday — let AI read your week and write the story: mood trend, spending, unfinished tasks."
                : "Generate an AI summary of this week from your notes, expenses, tasks, and habits."}
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Generate weekly review"
              onPress={handleGenerate}
              disabled={busy}
              style={[styles.generateButton, busy && styles.generateButtonDisabled]}
            >
              <Text style={styles.generateText}>
                {busy ? "Reading your week…" : "Generate review"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.summary}>{digest.ai.summary}</Text>

            {stats ? (
              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statText}>📝 {stats.notesWritten} notes</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statText}>
                    ✅ {stats.tasksDone}/{stats.tasksDone + stats.tasksPending} tasks
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statText}>
                    💸 {money(stats.currency, stats.totalSpent)}
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statText}>
                    🔥 {stats.activeStreaks} active streaks
                  </Text>
                </View>
              </View>
            ) : null}

            <MoodTrend digest={digest} />

            {stats && stats.topCategories.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>TOP SPEND</Text>
                {stats.topCategories.map((c) => (
                  <View key={c.category} style={styles.catRow}>
                    <View style={styles.catTop}>
                      <Text style={styles.catName}>{c.category}</Text>
                      <Text style={styles.catAmount}>
                        {money(stats.currency, c.amount)}
                      </Text>
                    </View>
                    <View style={styles.catTrack}>
                      <View
                        style={[
                          styles.catFill,
                          { width: `${Math.max(4, (c.amount / maxCat) * 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {stats && stats.pendingTasks.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>UNFINISHED TASKS</Text>
                {stats.pendingTasks.slice(0, 8).map((t, i) => (
                  <View key={`${i}-${t}`} style={styles.taskRow}>
                    <View style={styles.taskBox} />
                    <Text style={styles.taskText}>{t}</Text>
                  </View>
                ))}
                {stats.pendingTasks.length > 8 ? (
                  <Text style={styles.moreText}>
                    +{stats.pendingTasks.length - 8} more
                  </Text>
                ) : null}
              </View>
            ) : null}

            {digest.ai.keyMoments.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>KEY MOMENTS</Text>
                {digest.ai.keyMoments.map((k, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{k}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.digestFooter}>
              <Text style={styles.generatedText}>
                Generated{" "}
                {new Date(digest.generatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {digest.model}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Regenerate weekly review"
                onPress={handleGenerate}
                disabled={busy}
                style={styles.regenButton}
              >
                <Text style={styles.regenText}>
                  {busy ? "Working…" : "Regenerate"}
                </Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
