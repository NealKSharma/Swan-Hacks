import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
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
const NOISE_MEASURE_MS = 2000;
const NOISE_SAMPLE_MS = 100;

function noiseLevelFromMetering(db: number): { label: string; level: Level } {
  const clamped = Math.max(-80, Math.min(0, db));

  const score = Math.round(((clamped + 80) / 80) * 100);

  if (score < 35) {
    return { label: "Quiet", level: 1 };
  }

  if (score < 65) {
    return { label: "Moderate", level: 3 };
  }

  return { label: "Loud", level: 5 };
}

function ensureReportLevel(level: Level): Level {
  return Math.min(5, Math.max(1, level)) as Level;
}

export function ReportForm({ locationId, onSubmitted }: Props) {
  const [noise, setNoise] = useState<Level>(3);
  const [crowd, setCrowd] = useState<Level>(3);
  const [seating, setSeating] = useState<Level>(3);
  const [lighting, setLighting] = useState<Level>(3);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [measuringNoise, setMeasuringNoise] = useState(false);
  const [detectedNoise, setDetectedNoise] = useState<{ label: string; db: number } | null>(null);
  const noiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noiseRecordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    return () => {
      if (noiseTimerRef.current) {
        clearTimeout(noiseTimerRef.current);
        noiseTimerRef.current = null;
      }

      if (noiseRecordingRef.current) {
        void discardNoiseRecording(noiseRecordingRef.current);
        noiseRecordingRef.current = null;
      }
    };
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const reportNoiseLevel = ensureReportLevel(noise);
      const payload: NewReport = {
        location_id: locationId,
        noise_level: reportNoiseLevel,
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

  async function handleMeasureNoise() {
    let recording: Audio.Recording | null = null;

    setMeasuringNoise(true);
    setError(null);
    setDetectedNoise(null);

    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        setError("Microphone permission is needed to measure noise.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      let maxDb = Number.NEGATIVE_INFINITY;
      recording = new Audio.Recording();
      noiseRecordingRef.current = recording;

      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recording.setProgressUpdateInterval(NOISE_SAMPLE_MS);
      recording.setOnRecordingStatusUpdate((status: { isRecording: boolean; metering?: number }) => {
        if (status.isRecording && typeof status.metering === "number") {
          maxDb = Math.max(maxDb, status.metering);
        }
      });

      await recording.startAsync();
      await new Promise<void>((resolve) => {
        noiseTimerRef.current = setTimeout(resolve, NOISE_MEASURE_MS);
      });

      const status = await recording.getStatusAsync();
      if (typeof status.metering === "number") {
        maxDb = Math.max(maxDb, status.metering);
      }

      if (!Number.isFinite(maxDb)) {
        throw new Error("Could not read the microphone level.");
      }

      const roundedDb = Math.round(maxDb);
      const detected = noiseLevelFromMetering(roundedDb);
      setNoise(detected.level);
      setDetectedNoise({ label: detected.label, db: roundedDb });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not measure noise.");
    } finally {
      if (noiseTimerRef.current) {
        clearTimeout(noiseTimerRef.current);
        noiseTimerRef.current = null;
      }

      if (recording) {
        await discardNoiseRecording(recording);
        noiseRecordingRef.current = null;
      }

      setMeasuringNoise(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>Thanks for the report</Text>
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
        How does this place feel right now? Reports are anonymous. No account, no
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
      <View style={styles.measureBlock}>
        <Button
          label={measuringNoise ? "Measuring..." : "Measure Noise (2s)"}
          onPress={handleMeasureNoise}
          disabled={measuringNoise || submitting}
          variant="ghost"
        />
        {detectedNoise && (
          <Text style={styles.detectedNoise}>
            Detected: {detectedNoise.label} ({detectedNoise.db} dB)
          </Text>
        )}
      </View>
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

async function discardNoiseRecording(recording: Audio.Recording) {
  recording.setOnRecordingStatusUpdate(null);

  try {
    const status = await recording.getStatusAsync();
    if (status.canRecord || status.isRecording) {
      await recording.stopAndUnloadAsync();
    }
  } catch {
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // The temporary recording is intentionally discarded.
    }
  }
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
  measureBlock: { gap: spacing.xs },
  detectedNoise: { ...typography.small, color: colors.textSubtle },
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
