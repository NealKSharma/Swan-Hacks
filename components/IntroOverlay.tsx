// Cold-launch intro: solid background that matches the logo PNG's own
// off-white, big logo dead-centered, holds for a beat, then the entire
// overlay (canvas + logo together) slides up off the top, revealing the
// home page that's already mounted underneath.
//
// Opacity never changes anywhere. The whole overlay simply translates up
// as a single rigid unit, then unmounts the moment the slide finishes.

import { useEffect } from "react";
import {
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const LOGO = require("@/assets/logos/cysense_logo.png");
// Sampled from the logo PNG's own background (srgb 253,253,252) so the
// canvas blends seamlessly behind the image.
const LOGO_BG = "#FDFDFC";

const HOLD_MS = 1200;
const SLIDE_MS = 700;

interface Props {
  onDone: () => void;
}

export function IntroOverlay({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const logoSize = Math.min(width, height) * 0.6;

  // 0 = canvas at rest, 1 = canvas fully off the top of the screen
  const slide = useSharedValue(0);

  useEffect(() => {
    slide.value = withDelay(
      HOLD_MS,
      withTiming(
        1,
        { duration: SLIDE_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        }
      )
    );
  }, [onDone, slide]);

  // The entire overlay (background + logo) slides up as one rigid unit.
  // As it translates off the top, the home page rendered behind it is
  // revealed from the bottom up.
  const canvasStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -1 * height * slide.value }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.canvas, canvasStyle]}
    >
      <Image
        source={LOGO}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: LOGO_BG,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
});
