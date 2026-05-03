// Streamlined report sheet:
// • Two side-by-side draggable vertical sliders (Crowd, Audio)
// • Full-width "Record live audio level" button below
// • Cardinal submit button at the bottom
//
// Reports carry crowd_level + noise_level only. Seating, lighting, and
// comments were dropped from the schema and the form.

import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { submitReport } from "@/lib/dataSource";
import type { Level, NewReport } from "@/types";

interface Props {
  locationId: string;
  locationName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const NOISE_MEASURE_MS = 2000;
const NOISE_SAMPLE_MS = 100;

const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

export function ReportForm({
  locationId,
  locationName,
  onClose,
  onSubmitted,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [noise, setNoise] = useState<Level>(3);
  const [crowd, setCrowd] = useState<Level>(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [measuring, setMeasuring] = useState(false);
  const [detectedDb, setDetectedDb] = useState<number | null>(null);
  const noiseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noiseRecordingRef = useRef<Audio.Recording | null>(null);

  const trackHeight = Math.max(260, Math.min(360, windowHeight * 0.38));

  useEffect(() => {
    return () => {
      if (noiseTimerRef.current) {
        clearTimeout(noiseTimerRef.current);
        noiseTimerRef.current = null;
      }
      if (noiseRecordingRef.current) {
        void discardRecording(noiseRecordingRef.current);
        noiseRecordingRef.current = null;
      }
    };
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: NewReport = {
        location_id: locationId,
        noise_level: noise,
        crowd_level: crowd,
        anonymous_session_id: null,
      };
      await submitReport(payload);
      setSuccess(true);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMeasureNoise() {
    let recording: Audio.Recording | null = null;
    setMeasuring(true);
    setError(null);

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is needed to read the level.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Use AVERAGE of metering samples, not peak. Peak responds to a
      // single click or chair scrape and over-reports the room. Average
      // tracks the steady ambient level the user actually feels.
      let sumDbfs = 0;
      let count = 0;

      recording = new Audio.Recording();
      noiseRecordingRef.current = recording;

      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recording.setProgressUpdateInterval(NOISE_SAMPLE_MS);
      recording.setOnRecordingStatusUpdate((status) => {
        if (
          status.isRecording &&
          typeof status.metering === "number" &&
          Number.isFinite(status.metering) &&
          status.metering > -160 // ignore the dead-floor placeholder iOS sometimes emits
        ) {
          sumDbfs += status.metering;
          count += 1;
        }
      });

      await recording.startAsync();
      await new Promise<void>((resolve) => {
        noiseTimerRef.current = setTimeout(resolve, NOISE_MEASURE_MS);
      });

      if (count === 0) {
        throw new Error("Could not read the microphone level.");
      }

      const avgDbfs = sumDbfs / count;
      const splDb = dbfsToSpl(avgDbfs);
      const level = levelFromDbfs(avgDbfs);
      setDetectedDb(splDb);
      setNoise(level);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not measure noise.");
    } finally {
      if (noiseTimerRef.current) {
        clearTimeout(noiseTimerRef.current);
        noiseTimerRef.current = null;
      }
      if (recording) {
        await discardRecording(recording);
        noiseRecordingRef.current = null;
      }
      setMeasuring(false);
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.sheet, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Quick report</Text>
            <Text style={styles.title}>{locationName}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closePill,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.closePillText}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.headerRule} />

        {success ? (
          <View style={styles.successBlock}>
            <Text style={styles.successTitle}>Thanks for the report.</Text>
            <Text style={styles.successBody}>
              Your input helps other students find calmer spaces.
            </Text>
            <View style={styles.successActions}>
              <Button label="Done" variant="cardinal" onPress={onClose} />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSuccess(false);
                  setDetectedDb(null);
                }}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.successAgain}>Submit another</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.slidersRow}>
              <SliderColumn
                label="Crowd"
                value={crowd}
                onChange={setCrowd}
                topCue="Packed"
                bottomCue="Empty"
                height={trackHeight}
              />
              <SliderColumn
                label="Audio"
                value={noise}
                onChange={setNoise}
                topCue="Loud"
                bottomCue="Silent"
                height={trackHeight}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={measuring || submitting}
              onPress={handleMeasureNoise}
              style={({ pressed }) => [
                styles.measureBtn,
                measuring && styles.measureBtnActive,
                pressed && !measuring && { opacity: 0.92 },
                (measuring || submitting) && { opacity: 0.85 },
              ]}
            >
              <Icon
                name="metric-noise"
                size={22}
                color={measuring ? "#FFFFFF" : colors.text}
              />
              <Text
                style={[
                  styles.measureBtnText,
                  measuring && styles.measureBtnTextActive,
                ]}
              >
                {measuring ? "Listening…" : "Record live audio level"}
              </Text>
            </Pressable>

            <Text style={styles.measureHint}>
              {detectedDb != null
                ? `Detected: ~${detectedDb} dB. Audio slider set automatically.`
                : "Optional. Uses the mic for ~2 seconds, on-device only."}
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={[styles.submitRow, { paddingBottom: insets.bottom + spacing.lg }]}>
              <Button
                label={submitting ? "Submitting…" : "Submit anonymous report"}
                variant="cardinal"
                disabled={submitting}
                onPress={handleSubmit}
              />
            </View>
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// ----------------------------------------------------------------
// Vertical draggable slider — solid surfaces, no strokes.
// ----------------------------------------------------------------

const TRACK_WIDTH = 86;
const THUMB_SIZE = 64;

function SliderColumn({
  label,
  value,
  onChange,
  topCue,
  bottomCue,
  height,
}: {
  label: string;
  value: Level;
  onChange: (v: Level) => void;
  topCue: string;
  bottomCue: string;
  height: number;
}) {
  return (
    <View style={styles.sliderCol}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <Text style={styles.cueTop}>{topCue}</Text>
      <VerticalSlider value={value} onChange={onChange} height={height} />
      <Text style={styles.cueBottom}>{bottomCue}</Text>
    </View>
  );
}

function VerticalSlider({
  value,
  onChange,
  height,
}: {
  value: Level;
  onChange: (v: Level) => void;
  height: number;
}) {
  // The thumb's CENTER y is what we track. It travels the full 0..height
  // of the track so the fill can genuinely reach 0 (thumb at bottom) and
  // exactly height (thumb at top). The thumb visually overflows the track
  // at the extremes; the parent column reserves THUMB_SIZE/2 padding so
  // that overflow doesn't collide with the cue labels.
  const step = height / 4;

  const [displayValue, setDisplayValue] = useState<Level>(value);

  const centerY = useSharedValue((5 - value) * step);
  const startCenter = useSharedValue(0);
  const pressed = useSharedValue(0);
  const lastIdx = useSharedValue(5 - value);
  const dragging = useSharedValue(false);

  useEffect(() => {
    setDisplayValue(value);
    if (!dragging.value) {
      centerY.value = withSpring((5 - value) * step, SPRING);
      lastIdx.value = 5 - value;
    }
  }, [value, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = true;
      pressed.value = withSpring(1, SPRING);

      // Tap-to-jump: thumb center snaps directly under the finger.
      const target = Math.max(0, Math.min(height, e.y));
      centerY.value = target;
      startCenter.value = target;

      const idx = Math.round(target / step);
      if (idx !== lastIdx.value) {
        lastIdx.value = idx;
        const v = Math.max(1, Math.min(5, 5 - idx));
        runOnJS(setDisplayValue)(v as Level);
      }
    })
    .onUpdate((e) => {
      const newCenter = Math.max(
        0,
        Math.min(height, startCenter.value + e.translationY)
      );
      centerY.value = newCenter;

      const idx = Math.round(newCenter / step);
      if (idx !== lastIdx.value) {
        lastIdx.value = idx;
        const v = Math.max(1, Math.min(5, 5 - idx));
        runOnJS(setDisplayValue)(v as Level);
      }
    })
    .onEnd(() => {
      dragging.value = false;
      pressed.value = withSpring(0, SPRING);

      const idx = Math.round(centerY.value / step);
      const clampedIdx = Math.max(0, Math.min(4, idx));
      const next = (5 - clampedIdx) as Level;
      centerY.value = withSpring(clampedIdx * step, SPRING);
      runOnJS(onChange)(next);
    })
    .onFinalize(() => {
      dragging.value = false;
      pressed.value = withSpring(0, SPRING);
    });

  // Thumb's top edge = centerY - THUMB_SIZE/2. At centerY=0 the thumb is
  // half above the track; at centerY=height the thumb is half below it.
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: centerY.value - THUMB_SIZE / 2 },
      { scale: 1 + 0.06 * pressed.value },
    ],
  }));

  // Fill height tracks the thumb center exactly: full track when centerY
  // is at the top, zero when the centerY is at the bottom.
  const fillStyle = useAnimatedStyle(() => ({
    height: height - centerY.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.trackHost, { height, width: TRACK_WIDTH }]}>
        {/* Visual track with rounded corners and the clipped fill */}
        <View style={styles.trackBody}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        {/* Thumb floats over the track and may overflow at top/bottom */}
        <Animated.View style={[styles.thumb, thumbStyle]}>
          <Text style={styles.thumbValue}>{displayValue}</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// ----------------------------------------------------------------
// Audio helpers
// ----------------------------------------------------------------

/**
 * Map the average dBFS reading to a 1..5 sensory level. Cutoffs are
 * tuned so a typical quiet room (~40 dB SPL ≈ -30 dBFS) reads as 2 and
 * normal indoor activity sits around 3.
 *
 *   < -55  → 1  (silent / library hush, basically not reachable)
 *   -55..-28 → 2  (quiet room)
 *   -28..-16 → 3  (normal indoor activity)
 *   -16..-8  → 4  (loud room)
 *   > -8   → 5  (very loud)
 */
function levelFromDbfs(dbfs: number): Level {
  const v = Math.max(-80, Math.min(0, dbfs));
  if (v < -55) return 1;
  if (v < -28) return 2;
  if (v < -16) return 3;
  if (v < -8) return 4;
  return 5;
}

/**
 * Approximate dB SPL conversion for display. iOS metering returns dBFS
 * (0 = peak). With a typical iPhone mic, ambient quiet rooms read around
 * -30 dBFS which we surface as ~40 dB SPL.
 */
function dbfsToSpl(dbfs: number): number {
  const clamped = Math.max(-80, Math.min(0, dbfs));
  return Math.max(0, Math.round(clamped + 70));
}

async function discardRecording(recording: Audio.Recording) {
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
      // discarded intentionally
    }
  }
}

// ----------------------------------------------------------------
// Styles — solid surfaces, no strokes anywhere
// ----------------------------------------------------------------

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: 2,
  },
  closePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.cardinalSoft,
  },
  closePillText: {
    ...typography.bodyStrong,
    color: colors.cardinal,
  },
  headerRule: {
    height: 4,
    width: 64,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginTop: -spacing.sm,
  },

  // Sliders
  slidersRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
  },
  sliderCol: {
    alignItems: "center",
    gap: 6,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  cueTop: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 1,
  },
  cueBottom: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Slider host — positioning anchor for the visual track + thumb. The
  // thumb deliberately overflows it at the extremes; the parent column
  // adds vertical room so that overflow doesn't collide with cue labels.
  trackHost: {
    alignItems: "center",
    marginVertical: THUMB_SIZE / 2,
    overflow: "visible",
  },
  trackBody: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.card,
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cardinalSoft,
  },
  thumb: {
    position: "absolute",
    top: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.cardinal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  thumbValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },

  // Measure button
  measureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    minHeight: 56,
    ...shadows.card,
  },
  measureBtnActive: {
    backgroundColor: colors.cardinal,
  },
  measureBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
  },
  measureBtnTextActive: {
    color: "#FFFFFF",
  },
  measureHint: {
    ...typography.small,
    color: colors.text,
    textAlign: "center",
    marginTop: -spacing.sm,
  },

  error: { ...typography.body, color: colors.danger, textAlign: "center" },

  submitRow: {
    marginTop: "auto",
  },

  // Success state
  successBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  successBody: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
  },
  successActions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: "center",
  },
  successAgain: {
    ...typography.bodyStrong,
    color: colors.cardinal,
  },
});
