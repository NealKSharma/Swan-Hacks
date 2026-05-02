import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, typography } from "@/constants/theme";
import type { SensoryStatus } from "@/types";

interface Props {
  status: SensoryStatus;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

export function SensoryStatusPill({ status, size = "md", style }: Props) {
  const bg = colorFor(status);
  const padding =
    size === "sm"
      ? { paddingVertical: 4, paddingHorizontal: 12 }
      : size === "lg"
      ? { paddingVertical: 10, paddingHorizontal: 18 }
      : { paddingVertical: 6, paddingHorizontal: 14 };
  const fontSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;
  return (
    <View
      accessibilityLabel={`Sensory status: ${status}`}
      accessibilityRole="text"
      style={[styles.pill, { backgroundColor: bg }, padding, style]}
    >
      <Text style={[styles.label, { fontSize }]}>{status}</Text>
    </View>
  );
}

function colorFor(status: SensoryStatus): string {
  switch (status) {
    case "Quiet":
      return colors.quiet;
    case "Moderate":
      return colors.moderate;
    case "Busy":
      return colors.busy;
    case "Loud":
      return colors.loud;
  }
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  label: {
    ...typography.bodyStrong,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
