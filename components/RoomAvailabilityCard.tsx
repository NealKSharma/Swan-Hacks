// Rooms tab — clean rewrite to match the rest of the app's design language.
//
// • No borders anywhere — surfaces sit on the page.
// • surfaceMuted cards (same warm cream as MetricBadge / TrendBars).
// • cardinalSoft pill chips for time slots, cardinal text.
// • The whole rooms list is a FlatList so the rest of the page stays
//   non-scrollable and only this interior window scrolls.

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/Icon";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatTimeRange } from "@/utils/formatting";
import type {
  RoomAvailabilityGroup,
  RoomAvailabilityResponse,
  RoomAvailabilityRoom,
} from "@/types";

interface Props {
  availability: RoomAvailabilityResponse | null;
  loading: boolean;
}

const EMPTY_GROUPS: RoomAvailabilityResponse["groups"] = [];

export function RoomAvailabilityCard({ availability, loading }: Props) {
  const groups = useMemo(
    () => availability?.groups ?? EMPTY_GROUPS,
    [availability?.groups]
  );

  const firstGroupKey = groups[0]?.key ?? "";
  const [selectedGroupKey, setSelectedGroupKey] = useState(firstGroupKey);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  useEffect(() => {
    setSelectedGroupKey((cur) => (cur === firstGroupKey ? cur : firstGroupKey));
    setDropdownOpen(false);
  }, [firstGroupKey]);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!availability) {
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.stateText}>
          Couldn&apos;t reach LibCal right now.
        </Text>
      </View>
    );
  }

  const selectedGroup =
    groups.find((g) => g.key === selectedGroupKey) ?? groups[0] ?? null;

  return (
    <View style={styles.wrap}>
      {groups.length > 1 && selectedGroup ? (
        <GroupDropdown
          groups={groups}
          selectedKey={selectedGroup.key}
          open={dropdownOpen}
          onToggle={() => setDropdownOpen((v) => !v)}
          onSelect={(key) => {
            setSelectedGroupKey(key);
            setDropdownOpen(false);
          }}
        />
      ) : null}

      {selectedGroup ? (
        <RoomList
          group={selectedGroup}
          fallbackUrl={availability.booking_page_url}
        />
      ) : (
        <Text style={styles.stateText}>No rooms available.</Text>
      )}
    </View>
  );
}

function GroupDropdown({
  groups,
  selectedKey,
  open,
  onToggle,
  onSelect,
}: {
  groups: RoomAvailabilityGroup[];
  selectedKey: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (key: string) => void;
}) {
  const selected = groups.find((g) => g.key === selectedKey);
  // Trim long LibCal labels down to a single word for the trigger and menu
  // — keeps the chip compact without needing to tweak per-location.
  const shortLabel = (label: string) => label.split(/\s+/)[0] ?? label;
  const rotate = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    rotate.value = withTiming(open ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, rotate]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 90}deg` }],
  }));

  return (
    <View style={styles.dropdownWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.dropdownLabel} numberOfLines={1}>
          {selected ? shortLabel(selected.label) : "Select…"}
        </Text>
        <Animated.View style={chevronStyle}>
          <Icon name="chevron-right" size={16} color={colors.cardinal} />
        </Animated.View>
      </Pressable>

      {open ? (
        <View style={styles.dropdownMenu}>
          {groups.map((group, i) => {
            const isActive = group.key === selectedKey;
            return (
              <Pressable
                key={group.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => onSelect(group.key)}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  i > 0 && styles.dropdownItemDivider,
                  pressed && { backgroundColor: colors.cardinalSoft },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    isActive && styles.dropdownItemTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {shortLabel(group.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function RoomList({
  group,
  fallbackUrl,
}: {
  group: RoomAvailabilityGroup;
  fallbackUrl: string;
}) {
  if (group.rooms.length === 0) {
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.stateText}>
          No open rooms right now in {group.label}.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => openUrl(group.booking_page_url || fallbackUrl)}
          style={({ pressed }) => [
            styles.libcalCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.libcalCtaText}>Open in LibCal</Text>
          <Icon name="chevron-right" size={18} color={colors.cardinal} />
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={group.rooms}
      keyExtractor={(room) => `${group.key}-${room.room_id}`}
      renderItem={({ item }) => (
        <RoomRow room={item} fallbackUrl={group.booking_page_url || fallbackUrl} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
    />
  );
}

function RoomRow({
  room,
  fallbackUrl,
}: {
  room: RoomAvailabilityRoom;
  fallbackUrl: string;
}) {
  const reservationUrl = room.slots[0]?.reservation_url ?? fallbackUrl;
  const visibleSlots = room.slots.slice(0, 3);
  const extra = room.slots.length - visibleSlots.length;

  return (
    <Pressable
      onPress={() => openUrl(reservationUrl)}
      accessibilityRole="link"
      accessibilityLabel={`${room.room_name}. ${room.slots.length} open slot${room.slots.length === 1 ? "" : "s"}.`}
      style={({ pressed }) => [
        styles.roomCard,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text style={styles.roomName} numberOfLines={1}>
        {room.room_name}
      </Text>

      <View style={styles.slotRow}>
        {visibleSlots.map((slot) => (
          <Text
            key={`${room.room_id}-${slot.start}-${slot.end}`}
            style={styles.slotChip}
          >
            {formatTimeRange(slot.start, slot.end)}
          </Text>
        ))}
        {extra > 0 ? (
          <Text style={styles.moreText}>+{extra} more</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

async function openUrl(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        "Couldn't open booking page",
        `Open this URL manually:\n\n${url}`
      );
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn't open booking page",
      `Open this URL manually:\n\n${url}`
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: spacing.md,
  },

  // States
  stateBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  stateText: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
  },

  // Group dropdown — cardinalSoft pill chip, menu floats absolutely so
  // opening it doesn't shift the room list below.
  dropdownWrap: {
    position: "relative",
    alignSelf: "flex-start",
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.cardinalSoft,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.cardinal,
    letterSpacing: 0.2,
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  dropdownItem: {
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  dropdownItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(26,31,42,0.08)",
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  dropdownItemTextActive: {
    color: colors.cardinal,
    fontWeight: "700",
  },

  // Room list
  listContent: {
    paddingBottom: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  roomCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  // Slot chips
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  slotChip: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  moreText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  // Empty / fallback CTA
  libcalCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.cardinalSoft,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
  },
  libcalCtaText: {
    ...typography.bodyStrong,
    color: colors.cardinal,
  },
});
