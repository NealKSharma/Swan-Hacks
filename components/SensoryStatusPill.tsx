import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { Icon } from "@/components/Icon";
import { statusIconName } from "@/utils/formatting";
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
      ? { paddingVertical: 4, paddingHorizontal: 10 }
      : size === "lg"
      ? { paddingVertical: 10, paddingHorizontal: 16 }
      : { paddingVertical: 6, paddingHorizontal: 12 };
  const fontSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  return (
    <View
      accessibilityLabel={`Sensory status: ${status}`}
      accessibilityRole="text"
      style={[styles.pill, { backgroundColor: bg }, padding, style]}
    >
      <Icon name={statusIconName(status)} size={iconSize} color="#FFFFFF" />
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
    case "Overstimulating":
      return colors.overstimulating;
  }
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    ...typography.bodyStrong,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
