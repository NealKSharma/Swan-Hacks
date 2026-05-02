import { ReactNode } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/constants/theme";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  /** Add bottom padding to clear the floating tab bar (≈110px). Default true. */
  reserveTabBar?: boolean;
}

const TAB_BAR_RESERVE = 110;

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  reserveTabBar = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = reserveTabBar
    ? TAB_BAR_RESERVE
    : Math.max(insets.bottom, spacing.xxl);

  const content = [
    styles.content,
    { paddingBottom: bottomPadding },
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
});
