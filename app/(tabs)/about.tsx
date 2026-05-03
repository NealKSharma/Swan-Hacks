import { useCallback, useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, spacing, typography } from "@/constants/theme";

const HEADER_BLOCK_HEIGHT = 130;
const PAGE_COUNT = 4;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { height: windowHeight } = useWindowDimensions();

  const scrollY = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, [])
  );

  // Re-tap the About tab while already on it → snap back to first page.
  useEffect(() => {
    const unsub = navigation.addListener("tabPress" as never, () => {
      if (navigation.isFocused()) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    });
    return unsub;
  }, [navigation]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const pageHeight = windowHeight;

  return (
    <ScreenFade>
    <View style={styles.canvas}>
      <View
        pointerEvents="box-none"
        style={[styles.persistentHeader, { paddingTop: insets.top + spacing.xl }]}
      >
        <View style={styles.aboutTitleBlock}>
          <Text style={styles.bigAbout}>ABOUT</Text>
          <View style={styles.aboutRule} />
        </View>
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
        <SnapPage index={0} pageHeight={pageHeight} insets={insets} scrollY={scrollY}>
          <IntroSlide />
        </SnapPage>

        <SnapPage index={1} pageHeight={pageHeight} insets={insets} scrollY={scrollY}>
          <HowItWorksSlide />
        </SnapPage>

        <SnapPage index={2} pageHeight={pageHeight} insets={insets} scrollY={scrollY}>
          <PrivacySlide />
        </SnapPage>

        <SnapPage index={3} pageHeight={pageHeight} insets={insets} scrollY={scrollY}>
          <FutureSlide />
        </SnapPage>
      </AnimatedScrollView>

      <PageDots count={PAGE_COUNT} scrollY={scrollY} pageHeight={pageHeight} />
    </View>
    </ScreenFade>
  );
}

// ----------------------------------------------------------------
// Snap page — intentionally NOT pinned. Content scrolls with the
// ScrollView so the swipe reads as paginated scroll, not snap-pop.
// A gentle scale + opacity falloff softens the page edges.
// ----------------------------------------------------------------

function SnapPage({
  index,
  pageHeight,
  insets,
  scrollY,
  children,
}: {
  index: number;
  pageHeight: number;
  insets: { top: number; bottom: number };
  scrollY: Animated.SharedValue<number>;
  children: React.ReactNode;
}) {
  const animStyle = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value / pageHeight - index);

    // No pin-translate: content moves naturally with the scroll position.
    // Just a soft scale shrink and opacity dim as the page leaves view —
    // the user feels the scroll, but each page also has a beat where it
    // crisply snaps to its resting place.
    const scale = interpolate(
      distance,
      [0, 1],
      [1.0, 0.9],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      distance,
      [0, 0.6, 1],
      [1, 0.55, 0.25],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View
      style={{
        height: pageHeight,
        paddingTop: insets.top + HEADER_BLOCK_HEIGHT,
        paddingBottom: insets.bottom + 120,
        paddingLeft: 28,
        paddingRight: 44,
      }}
    >
      <Animated.View style={[{ flex: 1, justifyContent: "flex-start" }, animStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

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
      height: 12 + 22 * active,
      opacity: 0.45 + 0.55 * active,
    };
  });
  return <Animated.View style={[styles.pageDot, animStyle]} />;
}

// ----------------------------------------------------------------
// Slide eyebrow with a short gold rule beneath it (editorial detail).
// ----------------------------------------------------------------

function SlideEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.slideEyebrowBlock}>
      <Text style={styles.sectionEyebrow}>{children}</Text>
      <View style={styles.eyebrowRule} />
    </View>
  );
}

// ----------------------------------------------------------------
// Slides
// ----------------------------------------------------------------

function IntroSlide() {
  return (
    <View style={styles.slideStack}>
      <SlideEyebrow>About CySense</SlideEyebrow>
      <View>
        <Text style={styles.headline}>Find</Text>
        <Text style={[styles.headline, styles.headlineAccent]}>your spot.</Text>
      </View>
      <Text style={styles.body}>
        A quieter place to study before you walk into the wrong one. CySense
        shows which campus spaces are calm or loud right now, based on what
        other ISU students are seeing.
      </Text>
      <Text style={styles.body}>
        Useful if you&apos;re sensitive to noise or crowds. Useful if you&apos;re just
        sick of finding the library packed.
      </Text>
    </View>
  );
}

function HowItWorksSlide() {
  return (
    <View style={styles.slideStack}>
      <SlideEyebrow>How it works</SlideEyebrow>
      <View>
        <Text style={styles.headline}>Where the data</Text>
        <Text style={[styles.headline, styles.headlineAccent]}>comes from.</Text>
      </View>
      <View style={styles.numberedList}>
        <NumberedItem
          n="01"
          title="Other students"
          body="Most of what you see is people sharing what a space feels like as they pass through it."
        />
        <NumberedItem
          n="02"
          title="Your zone, if you&apos;re ok with it"
          body="If you turn on location, your phone tells the app which campus zone you&apos;re in. Off by default."
        />
        <NumberedItem
          n="03"
          title="A noise number"
          body="When you submit a report, your phone can read the decibel level. The number gets sent. The recording stays."
        />
      </View>
    </View>
  );
}

function PrivacySlide() {
  return (
    <View style={styles.slideStack}>
      <SlideEyebrow>Privacy</SlideEyebrow>
      <View>
        <Text style={styles.headline}>Off</Text>
        <Text style={[styles.headline, styles.headlineAccent]}>by default.</Text>
      </View>
      <View style={styles.bulletList}>
        <Bullet>No accounts. No profile. We don&apos;t know who you are.</Bullet>
        <Bullet>Location and microphone stay off until you turn them on.</Bullet>
        <Bullet>If you do turn on location, we know your zone, not your path.</Bullet>
        <Bullet>Audio never leaves the phone. Just the noise number.</Bullet>
      </View>
    </View>
  );
}

function FutureSlide() {
  return (
    <View style={styles.slideStack}>
      <SlideEyebrow>What&apos;s next</SlideEyebrow>
      <View>
        <Text style={styles.headline}>Coming</Text>
        <Text style={[styles.headline, styles.headlineAccent]}>soon.</Text>
      </View>
      <View style={styles.bulletList}>
        <Bullet>Routing between buildings that picks the quieter path.</Bullet>
        <Bullet>QR codes outside buildings so you can check before going in.</Bullet>
        <Bullet>Save your favorite spots, get a ping when one opens up.</Bullet>
        <Bullet>A place to leave a short note about a space for whoever shows up next.</Bullet>
      </View>
      <Text style={styles.footer}>Made for Swan Hacks at Iowa State.</Text>
    </View>
  );
}

function NumberedItem({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View style={styles.numberedRow}>
      <Text style={styles.numberedDigit}>{n}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.numberedTitle}>{title}</Text>
        <Text style={styles.numberedBody}>{body}</Text>
      </View>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
  },

  persistentHeader: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 0,
    zIndex: 10,
  },
  bigAbout: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.cardinal,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  aboutTitleBlock: {
    alignSelf: "flex-start",
    gap: 10,
  },
  aboutRule: {
    alignSelf: "stretch",
    height: 5,
    backgroundColor: colors.gold,
    borderRadius: 2.5,
  },

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

  slideStack: { gap: spacing.lg },

  // Editorial gold rule beneath the eyebrow caps
  sectionEyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "700",
  },
  slideEyebrowBlock: {
    alignSelf: "flex-start",
    gap: 10,
  },
  eyebrowRule: {
    alignSelf: "stretch",
    height: 4,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },

  headline: {
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 48,
    color: colors.text,
    letterSpacing: -1,
  },
  headlineAccent: {
    color: colors.cardinal,
    fontStyle: "italic",
  },
  body: {
    fontSize: 17,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  numberedList: { gap: spacing.lg, marginTop: spacing.md },
  numberedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  // Numbered digits in gold, not cardinal: gives the page a clear
  // editorial pop and balances all the cardinal headlines/eyebrows.
  numberedDigit: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    width: 56,
    lineHeight: 36,
  },
  numberedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  numberedBody: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },

  bulletList: { gap: spacing.md, marginTop: spacing.md },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  // Gold square bullets for a touch of yellow in the privacy/future lists
  bulletDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 22,
  },

  footer: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    fontStyle: "italic",
    marginTop: spacing.xl,
  },
});
