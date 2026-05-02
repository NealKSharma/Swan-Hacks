import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatTimeRange, timeAgo } from "@/utils/formatting";
import type { RoomAvailabilityResponse } from "@/types";

interface Props {
  availability: RoomAvailabilityResponse | null;
  loading: boolean;
}

export function RoomAvailabilityCard({ availability, loading }: Props) {
  const groups = availability?.groups ?? [];
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Study rooms right now</Text>
        <Text style={styles.bodyMuted}>Checking live availability from LibCal...</Text>
      </View>
    );
  }

  const [selectedGroupKey, setSelectedGroupKey] = useState(
    groups[0]?.key ?? ""
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedGroupKey(groups[0]?.key ?? "");
    setExpandedGroups({});
  }, [groups]);

  if (!availability) return null;

  const hasRooms = groups.some((group) => group.rooms.length > 0);
  const selectedGroup =
    groups.find((group) => group.key === selectedGroupKey) ??
    groups[0] ??
    null;

  async function openReservationUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "Unable to open booking page",
          `Open this URL manually in Safari:\n\n${url}`
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Unable to open booking page",
        `Open this URL manually in Safari:\n\n${url}`
      );
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Study rooms right now</Text>
          <Text style={styles.caption}>
            Live room openings from Iowa State&apos;s LibCal booking page.
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void openReservationUrl(availability.booking_page_url);
          }}
        >
          <Text style={styles.link}>Open LibCal</Text>
        </Pressable>
      </View>

      <Text style={styles.meta}>
        Updated {timeAgo(availability.fetched_at)}. Reservations finish on a third-party site.
      </Text>

      {availability.note ? <Text style={styles.note}>{availability.note}</Text> : null}

      {!hasRooms ? (
        <Text style={styles.bodyMuted}>
          No open rooms are showing right now. Open LibCal to check the full schedule.
        </Text>
      ) : (
        <View style={styles.roomList}>
          {groups.length > 1 ? (
            <View style={styles.selectorRow}>
              {groups.map((group) => {
                const selected = group.key === selectedGroup?.key;
                return (
                  <Pressable
                    key={group.key}
                    onPress={() => setSelectedGroupKey(group.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.selectorChip,
                      selected && styles.selectorChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        selected && styles.selectorTextSelected,
                      ]}
                    >
                      {group.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {selectedGroup ? (
            <View key={selectedGroup.key} style={styles.groupBlock}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{selectedGroup.label}</Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openReservationUrl(selectedGroup.booking_page_url);
                  }}
                >
                  <Text style={styles.groupLink}>Open source</Text>
                </Pressable>
              </View>

              {selectedGroup.rooms.length === 0 ? (
                <Text style={styles.bodyMuted}>
                  No open rooms are showing for this resource right now.
                </Text>
              ) : (
                (() => {
                  const expanded = expandedGroups[selectedGroup.key] ?? false;
                  const visibleRooms = expanded
                    ? selectedGroup.rooms
                    : selectedGroup.rooms.slice(0, 3);

                  return (
                    <>
                      {visibleRooms.map((room) => (
                        <View
                          key={`${selectedGroup.key}-${room.room_id}`}
                          style={styles.roomCard}
                        >
                          <View style={styles.roomHeader}>
                            <Text style={styles.roomName}>{room.room_name}</Text>
                            <Text style={styles.slotCount}>
                              {room.slots.length} open slot{room.slots.length === 1 ? "" : "s"}
                            </Text>
                          </View>

                          <View style={styles.slotWrap}>
                            {room.slots.slice(0, 4).map((slot) => (
                              <Text
                                key={`${selectedGroup.key}-${room.room_id}-${slot.start}-${slot.end}`}
                                style={styles.slotChip}
                              >
                                {formatTimeRange(slot.start, slot.end)}
                              </Text>
                            ))}
                            {room.slots.length > 4 ? (
                              <Text style={styles.moreChip}>+{room.slots.length - 4} more</Text>
                            ) : null}
                          </View>

                          <Button
                            label="Reserve in LibCal"
                            variant="secondary"
                            onPress={() => {
                              void openReservationUrl(
                                room.slots[0]?.reservation_url ??
                                  selectedGroup.booking_page_url
                              );
                            }}
                          />
                        </View>
                      ))}

                      {selectedGroup.rooms.length > 3 ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            setExpandedGroups((current) => ({
                              ...current,
                              [selectedGroup.key]: !expanded,
                            }))
                          }
                          style={styles.expandRow}
                        >
                          <Text style={styles.expandText}>
                            {expanded
                              ? "Show fewer rooms"
                              : `Show all ${selectedGroup.rooms.length} rooms`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </>
                  );
                })()
              )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: { ...typography.heading, color: colors.text },
  caption: { ...typography.small, color: colors.textSubtle },
  meta: { ...typography.small, color: colors.textMuted },
  bodyMuted: { ...typography.body, color: colors.textMuted },
  link: { ...typography.bodyStrong, color: colors.accent },
  note: {
    ...typography.small,
    color: colors.textSubtle,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  roomList: {
    gap: spacing.md,
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectorChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectorChipSelected: {
    backgroundColor: colors.cardinal,
    borderColor: colors.cardinal,
  },
  selectorText: { ...typography.bodyStrong, color: colors.text },
  selectorTextSelected: { color: "#FFFFFF" },
  groupBlock: {
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  groupTitle: { ...typography.bodyStrong, color: colors.text },
  groupLink: { ...typography.small, color: colors.accent },
  roomCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  roomName: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  slotCount: { ...typography.small, color: colors.textSubtle },
  slotWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slotChip: {
    ...typography.small,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  moreChip: {
    ...typography.small,
    color: colors.textSubtle,
    paddingVertical: 6,
  },
  expandRow: {
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  expandText: {
    ...typography.bodyStrong,
    color: colors.accent,
  },
});
