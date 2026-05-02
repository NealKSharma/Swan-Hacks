import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { colors, spacing, typography } from "@/constants/theme";
import {
  listAllRecentReports,
  listLocations,
} from "@/lib/dataSource";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { usePreferences } from "@/lib/preferencesStore";
import type { Report, SensoryStatus } from "@/types";

interface Counts {
  Quiet: number;
  Moderate: number;
  Busy: number;
  Loud: number;
  total: number;
}

const STAT_ROWS: { key: SensoryStatus; label: string }[] = [
  { key: "Quiet",    label: "quiet" },
  { key: "Moderate", label: "moderate" },
  { key: "Busy",     label: "busy" },
  { key: "Loud",     label: "loud" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { prefs } = usePreferences();
  const [counts, setCounts] = useState<Counts>({
    Quiet: 0,
    Moderate: 0,
    Busy: 0,
    Loud: 0,
    total: 0,
  });
  const [topPick, setTopPick] = useState<RankedLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [locations, reports] = await Promise.all([
      listLocations(),
      listAllRecentReports(120),
    ]);
    const map = new Map<string, Report[]>();
    for (const r of reports) {
      const arr = map.get(r.location_id) ?? [];
      arr.push(r);
      map.set(r.location_id, arr);
    }
    const ranked = rankLocations(locations, map, prefs);
    const tally: Counts = {
      Quiet: 0,
      Moderate: 0,
      Busy: 0,
      Loud: 0,
      total: ranked.length,
    };
    for (const r of ranked) tally[r.summary.status] += 1;
    setCounts(tally);
    setTopPick(ranked.find((r) => r.summary.status === "Quiet") ?? ranked[0] ?? null);
    setLoading(false);
  }, [prefs]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      load();
    }, [load])
  );

  return (
    <View style={styles.canvas}>
      {/* Decorative blobs distributed across the whole canvas — top is red,
          all blobs share the same opacity so the canvas reads evenly. */}
      <View style={[styles.blobTop,    { top: insets.top - 100 }]} />
      <View style={[styles.blobUpper,  { top: windowHeight * 0.18 }]} />
      <View style={[styles.blobMid,    { top: windowHeight * 0.45 }]} />
      <View style={[styles.blobLower,  { top: windowHeight * 0.7 }]} />
      <View style={[styles.blobBottom, { top: windowHeight * 0.92 }]} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* First-viewport region: greeting/wordmark pinned to top, hero
            block centered in the remaining space. flexGrow: 1 on the scroll
            content + flex: 1 here makes this region fill the visible
            viewport, so the hero sits roughly mid-screen. */}
        <View style={styles.firstViewport}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.wordmark}>CySense</Text>
            </View>
          </View>

          <View style={styles.heroCenter}>
            <View style={styles.heroBlock}>
              <Text style={styles.heroLine}>A calmer place</Text>
              <Text style={styles.heroLine}>to study,</Text>
              <Text style={[styles.heroLine, styles.heroLineAccent]}>right now.</Text>
            </View>

            <Text style={styles.sub}>
              Live, anonymous sensory info{"\n"}from students, for students.
            </Text>

            <View style={{ alignSelf: "flex-start", marginTop: spacing.xl }}>
              <Button
                variant="goldPill"
                label="Browse spaces"
                onPress={() => router.push("/spaces")}
              />
            </View>
          </View>
        </View>

        {/* Editorial stats — text only */}
        <Text style={styles.sectionEyebrow}>Campus · right now</Text>
        <View style={styles.statList}>
          {STAT_ROWS.map((row) => (
            <View key={row.key} style={styles.statRow}>
              <Text style={styles.statNumber}>
                {loading ? "—" : pad(counts[row.key])}
              </Text>
              <View style={styles.statDivider} />
              <Text style={styles.statLabel}>{row.label}</Text>
            </View>
          ))}
          <Text style={styles.statFooter}>
            {loading ? "" : `${counts.total} spaces tracked`}
          </Text>
        </View>

        {topPick && (
          <Pressable
            onPress={() => router.push(`/location/${topPick.location.slug}`)}
            style={({ pressed }) => [
              styles.pickRow,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="link"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionEyebrow}>Top pick for you</Text>
              <Text style={styles.pickTitle}>{topPick.location.name}</Text>
              <Text style={styles.pickSub}>
                {topPick.location.category} · {topPick.summary.status.toLowerCase()}
              </Text>
            </View>
            <View style={styles.pickArrow}>
              <Icon name="chevron-right" size={20} color={colors.cardinal} />
            </View>
          </Pressable>
        )}

        <Text style={styles.sectionEyebrow}>Privacy</Text>
        <Text style={styles.privacyHeadline}>
          Anonymous reports.{"\n"}No tracking.
        </Text>
        <Pressable
          onPress={() => router.push("/about")}
          accessibilityRole="link"
          style={styles.readMore}
        >
          <Text style={styles.readMoreText}>Read the principles</Text>
          <Icon name="chevron-right" size={16} color={colors.cardinal} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Decorative blob composition — distributed top-to-bottom for visual flow.
  // All blobs share opacity 0.7 so the canvas reads evenly top-to-bottom.
  blobTop: {
    position: "absolute",
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.cardinal,
    opacity: 0.7,
  },
  blobUpper: {
    position: "absolute",
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.gold,
    opacity: 0.7,
  },
  blobMid: {
    position: "absolute",
    right: -110,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.gold,
    opacity: 0.7,
  },
  blobLower: {
    position: "absolute",
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.cardinal,
    opacity: 0.7,
  },
  blobBottom: {
    position: "absolute",
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.gold,
    opacity: 0.7,
  },

  scroll: {
    flexGrow: 1,                // fills the viewport so the hero can center
    paddingHorizontal: 28,
    gap: spacing.xl,            // tighter section spacing now that dividers are gone
  },

  // First-viewport region (greeting at top, hero centered in remaining space)
  firstViewport: {
    flex: 1,                    // takes all viewport height the parent has
    minHeight: 520,             // sane fallback if flex resolves to 0
    gap: spacing.lg,
  },
  heroCenter: {
    flex: 1,
    justifyContent: "center",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  wordmark: {
    fontSize: 32,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: 4,
  },

  heroBlock: { gap: 0 },
  heroLine: {
    fontSize: 44,
    fontWeight: "700",
    lineHeight: 50,
    color: colors.text,
    letterSpacing: -1,
  },
  heroLineAccent: {
    color: colors.cardinal,
    fontStyle: "italic",
  },
  sub: {
    ...typography.body,
    color: colors.textSubtle,
    marginTop: spacing.md,
    lineHeight: 22,
  },

  // Section eyebrow
  sectionEyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "700",
  },

  // Stat list — small in-row divider is dark grey at low opacity so it
  // reads cleanly on the warm-white canvas (never white-on-white).
  statList: { gap: spacing.md, marginTop: spacing.md },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statNumber: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -1.5,
    width: 76,
    fontVariant: ["tabular-nums"],
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(26,31,42,0.18)",
  },
  statLabel: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.2,
    fontWeight: "500",
  },
  statFooter: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },

  // Top pick
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pickTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  pickSub: {
    ...typography.body,
    color: colors.textSubtle,
    marginTop: 4,
  },
  pickArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  // Privacy
  privacyHeadline: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 32,
    letterSpacing: -0.4,
    marginTop: spacing.md,
  },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  readMoreText: {
    ...typography.bodyStrong,
    color: colors.cardinal,
    letterSpacing: 0.4,
  },
});
