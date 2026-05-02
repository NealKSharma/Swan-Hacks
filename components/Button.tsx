import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { Icon } from "@/components/Icon";

type Variant = "primary" | "secondary" | "ghost" | "cardinal" | "goldPill";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  /** Show a small chevron after the label. Defaults true on goldPill. */
  withArrow?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  accessibilityLabel,
  withArrow,
}: ButtonProps) {
  const palette = paletteFor(variant);
  const isPill = variant === "goldPill";
  const showArrow = withArrow ?? isPill;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        isPill ? styles.pill : styles.box,
        { backgroundColor: palette.bg, borderColor: palette.border },
        variant !== "ghost" ? shadows.card : null,
        pressed && !disabled && { opacity: 0.88, transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
        {showArrow && <Icon name="chevron-right" size={18} color={palette.fg} />}
      </View>
    </Pressable>
  );
}

function paletteFor(variant: Variant) {
  switch (variant) {
    case "primary":
    case "cardinal":
      return { bg: colors.cardinal, fg: "#FFFFFF", border: colors.cardinal };
    case "goldPill":
      return { bg: colors.gold, fg: colors.text, border: colors.gold };
    case "secondary":
      return { bg: colors.surface, fg: colors.text, border: colors.border };
    case "ghost":
      return { bg: "transparent", fg: colors.cardinal, border: "transparent" };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  box: { borderRadius: radii.lg },
  pill: { borderRadius: radii.pill, paddingHorizontal: 28 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: {
    ...typography.bodyStrong,
    letterSpacing: 0.4,
  },
});
