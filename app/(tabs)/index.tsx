import { useCallback, useEffect, useRef, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  listAllRecentReports,
  listLocations,
} from "@/lib/dataSource";
import { getCrowdLevels } from "@/services/crowdSense";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { LIVE_REPORT_WINDOW_MINUTES } from "@/utils/sensoryScore";
import { usePreferences } from "@/lib/preferencesStore";
import type { CrowdLevel, Report, SensoryStatus } from "@/types";

interface Counts {
  Empty: number;
  Calm: number;
  Busy: number;
  Crowded: number;
  Overcrowded: number;
  total: number;
}

const STAT_ROWS: { key: SensoryStatus; label: string }[] = [
  { key: "Empty",       label: "empty" },
  { key: "Calm",        label: "calm" },
  { key: "Busy",        label: "busy" },
  { key: "Crowded",     label: "crowded" },
  { key: "Overcrowded", label: "overcrowded" },
];

const HEADER_BLOCK_HEIGHT = 100;
const PAGE_COUNT = 4;
const LIVE_SUMMARY_REFRESH_MS = 60_000;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { prefs } = usePreferences();
  const [counts, setCounts] = useState<Counts>({
    Empty: 0,
    Calm: 0,
    Busy: 0,
    Crowded: 0,
    Overcrowded: 0,
    total: 0,
  });
  const [topPick, setTopPick] = useState<RankedLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const scrollY = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const [locations, reports, crowdLevels] = await Promise.all([
      listLocations(),
      listAllRecentReports(LIVE_REPORT_WINDOW_MINUTES),
      getCrowdLevels().catch(() => [] as CrowdLevel[]),
    ]);
    const map = new Map<string, Report[]>();
    for (const r of reports) {
      const arr = map.get(r.location_id) ?? [];
      arr.push(r);
      map.set(r.location_id, arr);
    }
    const ranked = rankLocations(locations, map, prefs, crowdLevelMap(crowdLevels));
    const tally: Counts = {
      Empty: 0,
      Calm: 0,
      Busy: 0,
      Crowded: 0,
      Overcrowded: 0,
      total: ranked.length,
    };
    for (const r of ranked) tally[r.summary.status] += 1;
    setCounts(tally);
    // Prefer the calmest available space for the daily top pick.
    setTopPick(
      ranked.find((r) => r.summary.status === "Empty") ??
        ranked.find((r) => r.summary.status === "Calm") ??
        ranked[0] ??
        null
    );
    setLoading(false);
  }, [prefs]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-pull live summaries every minute so CrowdSense + decayed manual
  // reports don't get stale while the user lingers on the home tab.
  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, LIVE_SUMMARY_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      load();
    }, [load])
  );

  // Tap the Home tab again while already on Home → scroll back to first page.
  useEffect(() => {
    const unsub = navigation.addListener("tabPress" as never, () => {
      if (navigation.isFocused()) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    });
    return unsub;
  }, [navigation]);

  // scrollVelocity is the per-tick delta of scrollY. Sign tells us swipe
  // direction: > 0 = forward (down a page), < 0 = backward. Used by SnapPage
  // to apply the slow reveal curve only to the slide that's *arriving*,
  // independent of whether the user is going forward or backward.
  const prevScrollY = useSharedValue(0);
  const scrollVelocity = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    const y = e.contentOffset.y;
    scrollVelocity.value = y - prevScrollY.value;
    prevScrollY.value = y;
    scrollY.value = y;
  });

  const pageHeight = windowHeight;

  return (
    <ScreenFade>
    <View style={styles.canvas}>
      {/* Decorative blobs. fixed to viewport */}
      <View style={[styles.blobTop,    { top: insets.top - 100 }]} />
      <View style={[styles.blobUpper,  { top: pageHeight * 0.18 }]} />
      <View style={[styles.blobMid,    { top: pageHeight * 0.45 }]} />
      <View style={[styles.blobLower,  { top: pageHeight * 0.7 }]} />
      <View style={[styles.blobBottom, { top: pageHeight * 0.92 }]} />

      {/* Persistent header */}
      <View
        pointerEvents="box-none"
        style={[styles.persistentHeader, { paddingTop: insets.top + spacing.xl }]}
      >
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.wordmark}>CySense</Text>
      </View>

      <AnimatedScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        pagingEnabled
        decelerationRate="normal"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <SnapPage index={0} pageHeight={pageHeight} insets={insets} scrollY={scrollY} velocity={scrollVelocity}>
          <HeroSlide onBrowse={() => router.push("/spaces")} />
        </SnapPage>

        <SnapPage index={1} pageHeight={pageHeight} insets={insets} scrollY={scrollY} velocity={scrollVelocity}>
          <CampusSlide counts={counts} loading={loading} />
        </SnapPage>

        <SnapPage index={2} pageHeight={pageHeight} insets={insets} scrollY={scrollY} velocity={scrollVelocity}>
          <TopPickSlide
            topPick={topPick}
            onOpen={() =>
              topPick && router.push(`/location/${topPick.location.slug}`)
            }
          />
        </SnapPage>

        <SnapPage index={3} pageHeight={pageHeight} insets={insets} scrollY={scrollY} velocity={scrollVelocity}>
          <PrivacySlide onReadMore={() => router.push("/about")} />
        </SnapPage>
      </AnimatedScrollView>

      <PageDots count={PAGE_COUNT} scrollY={scrollY} pageHeight={pageHeight} />
    </View>
    </ScreenFade>
  );
}

// ----------------------------------------------------------------
// Snap page. outgoing shrinks fast, incoming pops in with overshoot.
// ----------------------------------------------------------------

function SnapPage({
  index,
  pageHeight,
  insets,
  scrollY,
  velocity,
  children,
}: {
  index: number;
  pageHeight: number;
  insets: { top: number; bottom: number };
  scrollY: Animated.SharedValue<number>;
  velocity: Animated.SharedValue<number>;
  children: React.ReactNode;
}) {
  const animStyle = useAnimatedStyle(() => {
    // Signed offset: positive = slide is behind us, negative = slide is ahead.
    const signed = scrollY.value / pageHeight - index;
    const distance = Math.abs(signed);

    // Pin the slide content to the viewport center by counter-translating
    // against scrollY. The ScrollView is still moving underneath, but the
    // content visually stays put — no scrolling appearance whatsoever.
    const pinTranslateY = scrollY.value - index * pageHeight;

    // A slide is "arriving" when its signed offset is heading toward 0,
    // i.e. when its sign is opposite the scroll direction. We compute it
    // from velocity so it works in both forward and backward swipes.
    //   - forward (vel > 0)  + ahead (signed < 0) → arriving
    //   - backward (vel < 0) + behind (signed > 0) → arriving
    // Otherwise the slide is leaving / at rest.
    const arriving = signed * velocity.value < 0;

    let scale: number;
    let opacity: number;

    if (arriving) {
      // Slow reveal: fade and scale up across most of the swipe so the new
      // slide eases in instead of popping in at the very end.
      scale = interpolate(
        distance,
        [0, 0.15, 0.4, 0.7, 1],
        [1.0, 0.95, 0.75, 0.55, 0.4],
        Extrapolation.CLAMP
      );
      opacity = interpolate(
        distance,
        [0, 0.15, 0.4, 0.7, 1],
        [1, 0.85, 0.4, 0.05, 0],
        Extrapolation.CLAMP
      );
    } else {
      // Snappy disappear: outgoing slide briefly overshoots then collapses
      // out of view inside the first 10% of the swipe, leaving an empty
      // viewport "beat" before the next one arrives.
      scale = interpolate(
        distance,
        [0, 0.03, 0.1, 0.5, 1],
        [1.0, 1.12, 0.4, 0.2, 0.2],
        Extrapolation.CLAMP
      );
      opacity = interpolate(
        distance,
        [0, 0.04, 0.1, 0.5, 1],
        [1, 0.95, 0, 0, 0],
        Extrapolation.CLAMP
      );
    }

    return {
      opacity,
      transform: [{ translateY: pinTranslateY }, { scale }],
    };
  });

  return (
    <View
      style={{
        height: pageHeight,
        paddingTop: insets.top + HEADER_BLOCK_HEIGHT,
        paddingBottom: insets.bottom + 120,
        paddingLeft: 28,
        paddingRight: 44, // clear the page-dot indicator on the right
        justifyContent: "center",
      }}
    >
      <Animated.View style={[{ flex: 1, justifyContent: "center" }, animStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

// ----------------------------------------------------------------
// Page dots (a touch larger now)
// ----------------------------------------------------------------

function PageDots({
  count,
  scrollY,
  pageHeight,
}: {
  count: number;
  scrollY: Animated.SharedValue<number>;
  pageHeight: number;
}) {
  return (
    <View style={styles.pageDots} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <PageDot key={i} index={i} scrollY={scrollY} pageHeight={pageHeight} />
      ))}
    </View>
  );
}

function PageDot({
  index,
  scrollY,
  pageHeight,
}: {
  index: number;
  scrollY: Animated.SharedValue<number>;
  pageHeight: number;
}) {
  const animStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value / pageHeight - index);
    const active = 1 - Math.min(1, distance);
    return {
      backgroundColor: active > 0.5 ? colors.cardinal : "rgba(26,31,42,0.22)",
      height: 12 + 22 * active, // base 12, grows to 34 when fully active
      opacity: 0.45 + 0.55 * active,
    };
  });
  return <Animated.View style={[styles.pageDot, animStyle]} />;
}

// ----------------------------------------------------------------
// Slides
// ----------------------------------------------------------------

function HeroSlide({ onBrowse }: { onBrowse: () => void }) {
  return (
    <View style={styles.slideStack}>
      <View>
        <Text style={styles.heroLine}>A calmer place</Text>
        <Text style={styles.heroLine}>to study,</Text>
        <Text style={[styles.heroLine, styles.heroLineAccent]}>right now.</Text>
      </View>
      <Text style={styles.sub}>
        Live, anonymous sensory info{"\n"}from students, for students.
      </Text>
      <View style={{ alignSelf: "flex-start", marginTop: spacing.xxl }}>
        <Button variant="goldPill" label="Browse spaces" onPress={onBrowse} />
      </View>
    </View>
  );
}

function CampusSlide({ counts, loading }: { counts: Counts; loading: boolean }) {
  return (
    <View style={styles.slideStack}>
      <Text style={styles.sectionEyebrow}>Campus · right now</Text>
      <View style={styles.statList}>
        {STAT_ROWS.map((row) => (
          <View key={row.key} style={styles.statRow}>
            <Text style={styles.statNumber}>
              {loading ? "." : pad(counts[row.key])}
            </Text>
            <View style={styles.statDivider} />
            <Text style={styles.statLabel}>{row.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TopPickSlide({
  topPick,
  onOpen,
}: {
  topPick: RankedLocation | null;
  onOpen: () => void;
}) {
  if (!topPick) {
    return (
      <View style={styles.slideStack}>
        <Text style={styles.sectionEyebrow}>Top pick for you</Text>
        <Text style={styles.heroLine}>No reports yet.</Text>
        <Text style={styles.sub}>
          Once students start sharing conditions, your best-fit space lands here.
        </Text>
      </View>
    );
  }

  const { location, summary, reasons } = topPick;
  return (
    <View style={styles.pickStack}>
      <Text style={styles.sectionEyebrow}>Top pick for you</Text>

      <View style={styles.pickCard}>
        <Text style={styles.pickStatusEyebrow}>
          Currently {summary.status.toLowerCase()}
        </Text>
        <Text style={styles.pickTitle}>{location.name}</Text>
        <Text style={styles.pickCategory}>{location.category}</Text>

        {reasons.length > 0 && (
          <View style={styles.pickReasons}>
            {reasons.slice(0, 3).map((r) => (
              <View key={r} style={styles.reasonChip}>
                <Text style={styles.reasonChipText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.pickFooter}>
          <View>
            <Text style={styles.pickFooterCount}>
              {summary.reportCount} recent
            </Text>
            <Text style={styles.pickFooterLabel}>
              report{summary.reportCount === 1 ? "" : "s"}
            </Text>
          </View>
          <Pressable
            onPress={onOpen}
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.pickCta,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.pickCtaText}>View details</Text>
            <Icon name="chevron-right" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.pickFootnote}>
        Based on your preferences and live reports.
      </Text>
    </View>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do you track me?",
    a: "Only if you opt in. Tracking is off by default and the app works fine without it.",
  },
  {
    q: "Are reports anonymous?",
    a: "Yes. No identity is ever attached.",
  },
  {
    q: "How do you find my zone?",
    a: "If you opt in, your phone's location resolves to a coarse zone. We never store the path or exact coordinates.",
  },
  {
    q: "Do you record audio?",
    a: "No raw audio. Only the decibel number leaves your phone.",
  },
];

function PrivacySlide({ onReadMore }: { onReadMore: () => void }) {
  return (
    <View style={styles.privacyStack}>
      <Text style={styles.sectionEyebrow}>Privacy · the short version</Text>
      <View style={styles.faqList}>
        {FAQ.map((item) => (
          <View key={item.q} style={styles.faqRow}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onReadMore}
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.readMoreChip,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.readMoreChipText}>Read the full principles</Text>
        <Icon name="chevron-right" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function crowdLevelMap(crowdLevels: CrowdLevel[]): Map<string, CrowdLevel> {
  const map = new Map<string, CrowdLevel>();
  for (const level of crowdLevels) map.set(level.zone_id, level);
  return map;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: colors.background },

  // Decorative blobs
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

  // Persistent header
  persistentHeader: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 0,
    zIndex: 10,
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

  // Page-dot indicator
  pageDots: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    zIndex: 5,
  },
  pageDot: {
    width: 6,
    borderRadius: 3,
  },

  // Slides
  slideStack: { gap: spacing.md },

  // Hero
  heroLine: {
    fontSize: 44,
    fontWeight: "700",
    lineHeight: 50,
    color: colors.text,
    letterSpacing: -1,
  },
  heroLineAccent: { color: colors.cardinal, fontStyle: "italic" },
  sub: {
    ...typography.body,
    color: colors.textSubtle,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  // Section eyebrow
  sectionEyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "700",
  },

  // Campus stats
  statList: { gap: spacing.md, marginTop: spacing.sm },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  statNumber: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -2,
    width: 100,
    fontVariant: ["tabular-nums"],
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(26,31,42,0.18)",
  },
  statLabel: {
    flex: 1,
    fontSize: 22,
    color: colors.text,
    letterSpacing: 0.2,
    fontWeight: "500",
  },
  // Top pick. taller card-style block
  pickStack: { gap: spacing.lg },
  pickCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  pickStatusEyebrow: {
    ...typography.caption,
    color: colors.gold,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "700",
  },
  pickTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  pickCategory: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  pickReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  reasonChip: {
    backgroundColor: colors.cardinalSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  reasonChipText: {
    fontSize: 13,
    color: colors.cardinal,
    fontWeight: "600",
  },
  pickFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,31,42,0.08)",
  },
  pickFooterCount: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  pickFooterLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    marginTop: -2,
  },
  pickCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  pickCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
  },
  pickFootnote: {
    ...typography.small,
    color: colors.text,
    fontStyle: "italic",
  },

  // Privacy FAQ. all text is black (never grey). Distinction between Q
  // and A comes from weight + size + line-height, not color.
  privacyStack: { gap: spacing.lg },
  faqList: { gap: spacing.lg, marginTop: spacing.sm },
  faqRow: { gap: 4 },
  faqQ: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  faqA: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 22,
  },
  // Read-more rendered as a cardinal pill so it stays readable over any
  // colored blob behind it (no more red-on-red).
  readMoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.cardinal,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    shadowColor: colors.cardinalDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  readMoreChipText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
