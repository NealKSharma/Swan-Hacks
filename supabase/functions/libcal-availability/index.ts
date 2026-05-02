declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type RawSlot = Record<string, unknown>;

interface LibCalSourceConfig {
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

interface LibCalLocationConfig {
  locationName: string;
  sources: LibCalSourceConfig[];
}

interface RoomAvailabilitySlot {
  start: string;
  end: string;
  reservation_url: string | null;
  libcal_eid?: string | null;
  libcal_checksum?: string | null;
  libcal_start?: string | null;
  libcal_gid?: string | null;
  libcal_lid?: string | null;
}

interface RoomAvailabilityRoom {
  room_id: string;
  room_name: string;
  availability_class: string | null;
  slots: RoomAvailabilitySlot[];
}

const LIBCAL_CONFIGS: Record<string, LibCalLocationConfig> = {
  "student-innovation-center": {
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

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function bookingPageUrlWithQuery(config: LibCalSourceConfig): string {
  const url = new URL(config.bookingPageUrl);
  url.searchParams.set("lid", String(config.lid));
  if (config.gid) url.searchParams.set("gid", String(config.gid));
  if (config.capacity !== 0 || url.searchParams.has("c")) {
    url.searchParams.set("c", String(config.capacity));
  }
  return url.toString();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractRoomNamesFromHtml(html: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const match of html.matchAll(
    /<td[^>]+data-resource-id=["']eid_(\d+)["'][^>]*>[\s\S]{0,1500}?<a[^>]+href=["']\/space\/\d+["'][^>]*>\s*<span[^>]*class=["'][^"']*fc-cell-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
  )) {
    const roomId = (match[1] ?? "").trim();
    const roomName = stripTags(match[2] ?? "");
    if (roomId && roomName) {
      out[roomId] = roomName;
    }
  }

  for (const match of html.matchAll(
    /data-eid=["'](\d+)["'][^>]*aria-label=["']Click for more info about\s+([^"']+)["']/gi
  )) {
    const roomId = (match[1] ?? "").trim();
    const roomName = stripTags(match[2] ?? "");
    if (roomId && roomName) {
      out[roomId] = roomName;
    }
  }

  for (const match of html.matchAll(
    /data-resource-id=["']eid_(\d+)["'][\s\S]{0,1200}?<span[^>]*class=["'][^"']*fc-cell-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
  )) {
    const roomId = (match[1] ?? "").trim();
    const roomName = stripTags(match[2] ?? "");
    if (roomId && roomName) {
      out[roomId] = roomName;
    }
  }

  for (const match of html.matchAll(
    /<a[^>]+href=["']\/space\/(\d+)["'][^>]*>[\s\S]{0,300}?<span[^>]*class=["'][^"']*fc-cell-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
  )) {
    const roomId = (match[1] ?? "").trim();
    const roomName = stripTags(match[2] ?? "");
    if (roomId && roomName && !out[roomId]) {
      out[roomId] = roomName;
    }
  }

  const patterns: Array<{ idIndex: number; nameIndex: number; regex: RegExp }> = [
    {
      regex:
        /data-(?:item-?id|eid)=["']?(\d+)["']?[^>]*>[\s\S]{0,500}?<[^>]*>([^<]{2,120})<\/[^>]+>/gi,
      idIndex: 1,
      nameIndex: 2,
    },
    {
      regex:
        /<[^>]+>([^<]{2,120})<\/[^>]+>[\s\S]{0,300}?data-(?:item-?id|eid)=["']?(\d+)["']?/gi,
      idIndex: 2,
      nameIndex: 1,
    },
    {
      regex:
        /["'](?:itemId|itemid|eid)["']\s*:\s*(\d+)[\s\S]{0,200}?["'](?:name|title|label)["']\s*:\s*["']([^"']{2,120})["']/gi,
      idIndex: 1,
      nameIndex: 2,
    },
    {
      regex:
        /["'](?:name|title|label)["']\s*:\s*["']([^"']{2,120})["'][\s\S]{0,200}?["'](?:itemId|itemid|eid)["']\s*:\s*(\d+)/gi,
      idIndex: 2,
      nameIndex: 1,
    },
    {
      regex:
        /(?:info|details)[^>]{0,200}?(?:item-?id|eid|rid)=["']?(\d+)["']?[\s\S]{0,300}?>([^<]{2,120})</gi,
      idIndex: 1,
      nameIndex: 2,
    },
  ];

  for (const { regex, idIndex, nameIndex } of patterns) {
    for (const match of html.matchAll(regex)) {
      const roomId = (match[idIndex] ?? "").trim();
      const rawName = stripTags(match[nameIndex] ?? "");
      if (!roomId || !rawName) continue;
      if (rawName.length < 3) continue;
      if (/^(info|details|book|reserve)$/i.test(rawName)) continue;
      if (/^\d+$/.test(rawName)) continue;
      if (!out[roomId] || rawName.length > out[roomId].length) {
        out[roomId] = rawName;
      }
    }
  }

  return out;
}

function slotClass(slot: RawSlot): string {
  return String(slot.className ?? slot.class ?? "").toLowerCase();
}

function slotIsAvailable(slot: RawSlot): boolean {
  const className = slotClass(slot);
  if (slot.available === true) return true;
  if (!className) return true;
  if (
    className.includes("checkout") ||
    className.includes("unavailable") ||
    className.includes("booked") ||
    className.includes("reserved") ||
    className.includes("pending")
  ) {
    return false;
  }
  return (
    className.includes("available") ||
    className.includes("avail") ||
    className.includes("open")
  );
}

function buildGridPayload(config: LibCalSourceConfig, date: string): URLSearchParams {
  const payload = new URLSearchParams();
  const endDate = new Date(`${date}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const nextDate = endDate.toISOString().slice(0, 10);

  for (const [key, value] of Object.entries(config.gridPayload)) {
    payload.set(key, value);
  }
  payload.set("start", date);
  payload.set("end", nextDate);
  return payload;
}

function toDisplayName(
  config: LibCalSourceConfig,
  roomId: string,
  roomNames: Record<string, string>
): string {
  return roomNames[roomId] ?? config.rooms[roomId] ?? `${config.label} ${roomId}`;
}

function mergeAdjacentSlots(slots: RoomAvailabilitySlot[]): RoomAvailabilitySlot[] {
  if (slots.length <= 1) return slots;
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const merged: RoomAvailabilitySlot[] = [];

  for (const slot of sorted) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.end === slot.start &&
      last.reservation_url === slot.reservation_url
    ) {
      last.end = slot.end;
      continue;
    }
    merged.push({ ...slot });
  }

  return merged;
}

function normalizeRooms(
  slots: RawSlot[],
  config: LibCalSourceConfig,
  roomNames: Record<string, string>
): RoomAvailabilityRoom[] {
  const byRoom = new Map<string, RoomAvailabilityRoom>();
  const configuredRoomIds = Object.keys(config.rooms);
  const allowedRoomIds = new Set(configuredRoomIds);
  const enforceConfiguredIds = configuredRoomIds.length > 0;

  for (const slot of slots) {
    if (!slotIsAvailable(slot)) continue;

    const roomId = String(slot.itemId ?? slot.itemid ?? slot.id ?? "").trim();
    if (!roomId) continue;
    if (enforceConfiguredIds && !allowedRoomIds.has(roomId)) continue;

    const room = byRoom.get(roomId) ?? {
      room_id: roomId,
      room_name: toDisplayName(config, roomId, roomNames),
      availability_class: slotClass(slot) || null,
      slots: [],
    };

    room.slots.push({
      start: typeof slot.start === "string" ? slot.start : "",
      end: typeof slot.end === "string" ? slot.end : "",
      reservation_url: bookingPageUrlWithQuery(config),
      libcal_eid: roomId,
      libcal_checksum: typeof slot.checksum === "string" ? slot.checksum : null,
      libcal_start: typeof slot.start === "string" ? slot.start : null,
      libcal_gid: String(config.gid),
      libcal_lid: String(config.lid),
    });

    byRoom.set(roomId, room);
  }

  return [...byRoom.values()]
    .map((room) => ({
      ...room,
      slots: mergeAdjacentSlots(room.slots.filter((slot) => slot.start && slot.end)),
    }))
    .filter((room) => room.slots.length > 0)
    .sort((a, b) => a.room_name.localeCompare(b.room_name));
}

async function fetchSourceGrid(
  config: LibCalSourceConfig,
  date: string
): Promise<Record<string, unknown>> {
  const payload = buildGridPayload(config, date);
  const response = await fetch(config.gridEndpointUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: bookingPageUrlWithQuery(config),
      Origin: new URL(config.bookingPageUrl).origin,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `${config.key} grid failed with ${response.status}. ${text.slice(0, 250)} payload=${payload.toString()}`
    );
  }

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) {
    throw new Error(`${config.key} grid returned non-JSON content.`);
  }
  if (!Array.isArray(data.slots) && !Array.isArray(data.gridData)) {
    throw new Error(`${config.key} grid returned unexpected keys: ${Object.keys(data).join(", ")}`);
  }

  return data;
}

async function fetchSourcePageHtml(config: LibCalSourceConfig): Promise<string> {
  const response = await fetch(bookingPageUrlWithQuery(config), {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
    },
  });

  if (!response.ok) {
    return "";
  }

  return response.text().catch(() => "");
}

function parseRequest(request: Request): Promise<{ slug: string; date: string }> {
  if (request.method === "GET") {
    const { searchParams } = new URL(request.url);
    return Promise.resolve({
      slug: searchParams.get("slug") ?? "",
      date: searchParams.get("date") ?? "",
    });
  }

  return request
    .json()
    .catch(() => ({}))
    .then((body) => ({
      slug: typeof body.slug === "string" ? body.slug : "",
      date: typeof body.date === "string" ? body.date : "",
    }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { slug, date } = await parseRequest(request);
  const config = LIBCAL_CONFIGS[slug];

  if (!config) {
    return json({ error: `No LibCal configuration exists for slug "${slug}".` }, { status: 404 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const groups = [];
    for (const source of config.sources) {
      const [grid, pageHtml] = await Promise.all([
        fetchSourceGrid(source, date),
        fetchSourcePageHtml(source),
      ]);
      const rawSlots = Array.isArray(grid.slots)
        ? (grid.slots as RawSlot[])
        : Array.isArray(grid.gridData)
          ? (grid.gridData as RawSlot[])
          : [];
      const scrapedRoomNames = pageHtml ? extractRoomNamesFromHtml(pageHtml) : {};

      groups.push({
        key: source.key,
        label: source.label,
        booking_page_url: bookingPageUrlWithQuery(source),
        rooms: normalizeRooms(rawSlots, source, scrapedRoomNames),
      });
    }

    return json({
      location_slug: slug,
      location_name: config.locationName,
      date,
      booking_page_url: groups[0]?.booking_page_url ?? "",
      fetched_at: new Date().toISOString(),
      source: "libcal-live",
      groups,
      note:
        "CySense reads the live LibCal availability grid and links out to LibCal to finish the booking.",
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown LibCal error.",
        booking_page_url: config.sources[0]
          ? bookingPageUrlWithQuery(config.sources[0])
          : "",
      },
      { status: 500 }
    );
  }
});
