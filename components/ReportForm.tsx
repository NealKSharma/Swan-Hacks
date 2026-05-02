import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { Button } from "@/components/Button";
import { levelLabel } from "@/utils/formatting";
import type { Level, NewReport } from "@/types";
import { submitReport } from "@/lib/dataSource";

interface Props {
  locationId: string;
  onSubmitted?: () => void;
}

const LEVELS: Level[] = [1, 2, 3, 4, 5];

export function ReportForm({ locationId, onSubmitted }: Props) {
  const [noise, setNoise] = useState<Level>(3);
  const [crowd, setCrowd] = useState<Level>(3);
  const [seating, setSeating] = useState<Level>(3);
  const [lighting, setLighting] = useState<Level>(3);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: NewReport = {
        location_id: locationId,
        noise_level: noise,
        crowd_level: crowd,
        seating_level: seating,
        lighting_level: lighting,
        comment: comment.trim() || null,
        anonymous_session_id: null,
      };
      await submitReport(payload);
      setSuccess(true);
      setComment("");
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>Thanks for the report 🌿</Text>
        <Text style={styles.successBody}>
          Your anonymous report helps other students find calmer spaces.
        </Text>
        <Button label="Submit another" variant="ghost" onPress={() => setSuccess(false)} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.intro}>
        How does this place feel right now? Reports are anonymous — no account, no
        location tracking.
      </Text>

      <Field
        label="Noise"
        helper={`Currently: ${levelLabel("noise", noise)}`}
        value={noise}
        onChange={setNoise}
        leftCue="Silent"
        rightCue="Very loud"
      />
      <Field
        label="Crowd"
        helper={`Currently: ${levelLabel("crowd", crowd)}`}
        value={crowd}
        onChange={setCrowd}
        leftCue="Empty"
        rightCue="Packed"
      />
      <Field
        label="Seating"
        helper={`Currently: ${levelLabel("seating", seating)}`}
        value={seating}
        onChange={setSeating}
        leftCue="None"
        rightCue="Wide open"
      />
      <Field
        label="Lighting"
        helper={`Currently: ${levelLabel("lighting", lighting)}`}
        value={lighting}
        onChange={setLighting}
        leftCue="Dim"
        rightCue="Harsh"
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.fieldLabel}>Comment (optional)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="e.g., 2nd floor nooks are open"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={240}
          style={styles.input}
          accessibilityLabel="Optional comment"
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label={submitting ? "Submitting…" : "Submit anonymous report"}
        onPress={handleSubmit}
        disabled={submitting}
        variant="cardinal"
      />
    </View>
  );
}

interface FieldProps {
  label: string;
  helper: string;
  value: Level;
  onChange: (v: Level) => void;
  leftCue: string;
  rightCue: string;
}

function Field({ label, helper, value, onChange, leftCue, rightCue }: FieldProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldHelper}>{helper}</Text>
      </View>
      <View
        style={styles.scale}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} level ${value} of 5`}
      >
        {LEVELS.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={({ pressed }) => [
                styles.dot,
                selected && styles.dotSelected,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Set ${label.toLowerCase()} to ${n}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.dotLabel, selected && styles.dotLabelSelected]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.cues}>
        <Text style={styles.cue}>{leftCue}</Text>
        <Text style={styles.cue}>{rightCue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  intro: { ...typography.body, color: colors.textSubtle },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  fieldLabel: { ...typography.bodyStrong, color: colors.text },
  fieldHelper: { ...typography.small, color: colors.textSubtle },
  scale: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dot: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotLabel: { ...typography.bodyStrong, color: colors.text },
  dotLabelSelected: { color: "#FFFFFF" },
  cues: { flexDirection: "row", justifyContent: "space-between" },
  cue: { ...typography.caption, color: colors.textMuted },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 80,
    color: colors.text,
    ...typography.body,
    textAlignVertical: "top",
  },
  error: { ...typography.body, color: colors.danger },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  successTitle: { ...typography.title, color: colors.text },
  successBody: { ...typography.body, color: colors.textSubtle },
});
