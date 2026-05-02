import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost" | "cardinal";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const palette = paletteFor(variant);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

function paletteFor(variant: Variant) {
  switch (variant) {
    case "primary":
      return { bg: colors.accent, fg: "#FFFFFF", border: colors.accent };
    case "cardinal":
      return { bg: colors.cardinal, fg: "#FFFFFF", border: colors.cardinal };
    case "secondary":
      return {
        bg: colors.surface,
        fg: colors.text,
        border: colors.border,
      };
    case "ghost":
      return {
        bg: "transparent",
        fg: colors.accent,
        border: "transparent",
      };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48, // accessible touch target
  },
  label: {
    ...typography.bodyStrong,
  },
});
