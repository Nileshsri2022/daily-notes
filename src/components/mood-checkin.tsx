import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { dayKey } from "@/lib/calendar";
import { MOOD_SCALE } from "@/lib/moods";
import { styles } from "@/styles/mood.styles";

/**
 * One-tap daily mood check-in, shown at the top of the notes feed.
 * Tapping an emoji logs (or updates) today's mood.
 */
export function MoodCheckin() {
  const todayKey = dayKey(new Date());
  const todayMood = useQuery(api.moods.getDay, { date: todayKey });
  const logMood = useMutation(api.moods.log);

  const selected = todayMood?.score ?? null;

  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>How are you feeling today?</Text>
      <View style={styles.row}>
        {MOOD_SCALE.map((m) => {
          const isSelected = selected === m.score;
          return (
            <Pressable
              key={m.score}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Mood ${m.score} out of 5: ${m.label}`}
              onPress={() => logMood({ date: todayKey, score: m.score })}
              style={[
                styles.moodButton,
                isSelected && [
                  styles.moodButtonSelected,
                  { borderColor: m.color, backgroundColor: `${m.color}1F` },
                ],
              ]}
            >
              <Text style={styles.emoji}>{m.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected !== null ? (
        <Text style={styles.caption}>
          Feeling {MOOD_SCALE[selected - 1].label} today
        </Text>
      ) : null}
    </View>
  );
}
