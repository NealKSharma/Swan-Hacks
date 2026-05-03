import type { RoomAvailabilityResponse } from "@/types";

export interface LibCalSourceConfig {
  key: string;
  label: string;
  bookingPageUrl: string;
  gridEndpointUrl: string;
  lid: number;
  gid: number;
  capacity: number;
  gridPayload: Record<string, string>;
  rooms: Record<string, string>;
}

export interface LibCalLocationConfig {
  slug: string;
  locationName: string;
  sources: LibCalSourceConfig[];
}

export const LIBCAL_LOCATION_CONFIGS: Record<string, LibCalLocationConfig> = {
  "student-innovation-center": {
    slug: "student-innovation-center",
    locationName: "Student Innovation Center",
    sources: [
      {
        key: "sic-study-rooms",
        label: "Study rooms",
        bookingPageUrl: "https://sictr-iastate.libcal.com/spaces?lid=15606&gid=38061&c=0",
        gridEndpointUrl: "https://sictr-iastate.libcal.com/spaces/availability/grid",
        lid: 15606,
        gid: 38061,
        capacity: 0,
        gridPayload: {
          lid: "15606",
          gid: "0",
          eid: "-1",
          seat: "0",
          seatId: "0",
          zone: "0",
          pageIndex: "0",
          pageSize: "18",
        },
        rooms: {
          "152710": "SICTR 0122",
          "152711": "SICTR 2233",
          "152712": "SICTR 2237",
          "152713": "SICTR 3131",
          "152714": "SICTR 3136",
          "152715": "SICTR 3138",
        },
      },
    ],
  },
  "parks-library": {
    slug: "parks-library",
    locationName: "Parks Library",
    sources: [
      {
        key: "parks-individual-pods",
        label: "Individual study pods",
        bookingPageUrl: "https://iastate.libcal.com/spaces?lid=14797",
        gridEndpointUrl: "https://iastate.libcal.com/spaces/availability/grid",
        lid: 14797,
        gid: 0,
        capacity: 0,
        gridPayload: {
          lid: "14797",
          gid: "0",
          eid: "-1",
          seat: "0",
          seatId: "0",
          zone: "0",
          pageIndex: "0",
          pageSize: "18",
        },
        rooms: {
          "119694": "261 - Individual Study Room",
          "119701": "262 - Individual Study Room",
          "119706": "263 - Individual Study Room",
          "119708": "264 - Individual Study Room",
          "119713": "361 - Individual Study Room",
          "119714": "362 - Individual Study Room",
          "119715": "363 - Individual Study Room",
          "119716": "364 - Individual Study Room",
          "170092": "Pod 1",
          "170093": "Pod 2",
          "170094": "Pod 3",
          "170309": "Pod 4",
          "170964": "Pod 5 - Wheelchair accessible",
          "204243": "Pod 6",
          "214468": "Pod 7",
        },
      },
      {
        key: "parks-group-rooms",
        label: "Group study rooms",
        bookingPageUrl: "https://iastate.libcal.com/spaces?lid=3759",
        gridEndpointUrl: "https://iastate.libcal.com/spaces/availability/grid",
        lid: 3759,
        gid: 0,
        capacity: 0,
        gridPayload: {
          lid: "3759",
          gid: "0",
          eid: "-1",
          seat: "0",
          seatId: "0",
          zone: "0",
          pageIndex: "0",
          pageSize: "18",
        },
        rooms: {
          "35960": "004 - Group Study Room",
          "51024": "101A - Group Study Room",
          "51025": "101B - Group Study Room",
          "51026": "101C - Group Study Room",
          "51027": "101D - Group Study Room",
          "51028": "101E - Group Study Room",
          "51029": "101G - Group Study Room",
          "56246": "101H - Group Study Room",
          "35962": "130B - Group Study Room",
          "35963": "130C - Group Study Room",
          "35964": "130D - Group Study Room",
          "35943": "153 - Conference Room",
          "35941": "197 - Conference Room",
          "35953": "306A - Group Study Room",
          "35954": "306B - Group Study Room",
          "35955": "306C - Group Study Room",
          "35956": "306D - Group Study Room",
          "35957": "306E - Group Study Room",
          "35958": "306F - Group Study Room",
        },
      },
    ],
  },
};

export function getLibCalConfig(slug: string): LibCalLocationConfig | null {
  return LIBCAL_LOCATION_CONFIGS[slug] ?? null;
}

export function buildMockRoomAvailability(
  slug: string,
  date: string
): RoomAvailabilityResponse | null {
  const config = getLibCalConfig(slug);
  if (!config) return null;

  const groups = config.sources.map((source, index) => ({
    key: source.key,
    label: source.label,
    booking_page_url: source.bookingPageUrl,
    rooms:
      index === 0
        ? [
            {
              room_id: "mock-room-1",
              room_name: source.rooms[Object.keys(source.rooms)[0] ?? ""] || "Available room",
              availability_class: null,
              slots: [
                {
                  start: `${date}T13:00:00-05:00`,
                  end: `${date}T14:00:00-05:00`,
                  reservation_url: source.bookingPageUrl,
                  libcal_eid: Object.keys(source.rooms)[0] ?? null,
                  libcal_checksum: "mock-checksum-1",
                  libcal_start: `${date} 13:00:00`,
                  libcal_gid: String(source.gid),
                  libcal_lid: String(source.lid),
                },
              ],
            },
          ]
        : [
            {
              room_id: "mock-room-2",
              room_name: source.rooms[Object.keys(source.rooms)[1] ?? ""] || "Available room",
              availability_class: null,
              slots: [
                {
                  start: `${date}T15:00:00-05:00`,
                  end: `${date}T16:00:00-05:00`,
                  reservation_url: source.bookingPageUrl,
                  libcal_eid: Object.keys(source.rooms)[1] ?? null,
                  libcal_checksum: "mock-checksum-2",
                  libcal_start: `${date} 15:00:00`,
                  libcal_gid: String(source.gid),
                  libcal_lid: String(source.lid),
                },
              ],
            },
          ],
  }));

  return {
    slug,
    date,
    booking_page_url: config.sources[0]?.bookingPageUrl ?? "",
    fetched_at: new Date().toISOString(),
    note: "Showing demo room openings because the LibCal backend is not configured.",
    groups,
  };
}
