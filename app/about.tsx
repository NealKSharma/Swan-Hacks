import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";

export default function AboutScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>About</Text>
        <Text style={styles.title}>CySense</Text>
        <Text style={styles.body}>
          CySense is a sensory-aware campus companion built by Iowa State students.
          It helps you find calmer, less crowded, more usable spaces — useful for
          students with sensory sensitivities, neurodivergent students, anyone
          easily overwhelmed by loud or crowded environments, and really anyone
          looking for a better study spot.
        </Text>
      </View>

      <Section title="How it works today">
        <Bullet>
          Students submit quick, anonymous reports on noise, crowd, seating, and
          lighting at campus locations.
        </Bullet>
        <Bullet>
          We aggregate recent reports into a sensory comfort score and a plain
          status label — Quiet, Moderate, Busy, or Overstimulating.
        </Bullet>
        <Bullet>
          Your preferences (set in Preferences) tilt recommendations toward
          spaces that fit you.
        </Bullet>
      </Section>

      <Section title="Privacy principles">
        <Bullet>No accounts required for the MVP. No tracking of individual students.</Bullet>
        <Bullet>
          Reports are anonymous and aggregated. We do not store personal location
          histories.
        </Bullet>
        <Bullet>
          We use predefined campus zones, not continuous GPS trails. Indoor
          positioning is deliberately not used.
        </Bullet>
        <Bullet>No raw audio is recorded or stored — ever.</Bullet>
        <Bullet>
          If we add density estimation later, it will be opt-in, aggregated by
          zone, and never tied to identity.
        </Bullet>
      </Section>

      <Section title="Future vision">
        <Bullet>
          Aggregated, opt-in location density so live crowd info doesn&apos;t depend
          on manual reporting alone.
        </Bullet>
        <Bullet>
          Campus-installed decibel readers in select hotspots, providing live noise
          data without recording sound.
        </Bullet>
        <Bullet>
          More accurate historical predictions as report volume grows.
        </Bullet>
        <Bullet>
          QR codes posted at building entrances — scan to view current conditions
          or submit a quick report.
        </Bullet>
        <Bullet>
          Optional accounts for personalized alerts (e.g., &ldquo;Parks Library is quiet
          right now&rdquo;).
        </Bullet>
        <Bullet>Sensory-friendly route planning between buildings.</Bullet>
        <Bullet>
          A community board for location-specific anonymous notes and tips.
        </Bullet>
      </Section>

      <Section title="On-device sound classification (future)">
        <Text style={styles.body}>
          We&apos;re exploring a short, on-device sound sample (Shazam-style) to help
          classify environment noise — but only if it can be done locally with no
          raw audio leaving the phone. Until that&apos;s feasible and clearly
          privacy-safe, we stick to manual reporting.
        </Text>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Built for Swan Hacks at Iowa State University.</Text>
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { ...typography.display, color: colors.text },
  body: { ...typography.body, color: colors.textSubtle },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardTitle: { ...typography.heading, color: colors.text },
  bulletRow: { flexDirection: "row", gap: spacing.sm },
  bulletDot: { ...typography.bodyStrong, color: colors.cardinal, lineHeight: 22 },
  footer: { paddingTop: spacing.md, alignItems: "center" },
  footerText: { ...typography.small, color: colors.textMuted },
});
