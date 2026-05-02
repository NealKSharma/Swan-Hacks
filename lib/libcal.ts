import { buildMockRoomAvailability, getLibCalConfig } from "@/constants/libcal";
import {
  getSupabase,
  supabasePublicAnonKey,
  supabasePublicUrl,
} from "@/lib/supabase";
import type { RoomAvailabilityResponse } from "@/types";

function localDateISO(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

export function locationSupportsRoomAvailability(slug: string): boolean {
  return getLibCalConfig(slug) != null;
}

export async function getRoomAvailability(
  slug: string,
  date = localDateISO()
): Promise<RoomAvailabilityResponse | null> {
  const config = getLibCalConfig(slug);
  if (!config) return null;

  const sb = getSupabase();
  if (!sb) return buildMockRoomAvailability(slug, date);

  try {
    const functionUrl = `${supabasePublicUrl}/functions/v1/libcal-availability`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabasePublicAnonKey,
        Authorization: `Bearer ${supabasePublicAnonKey}`,
      },
      body: JSON.stringify({ slug, date }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `libcal-availability ${response.status}: ${text.slice(0, 300)}`
      );
    }

    if (!text) {
      throw new Error("Empty response from libcal-availability.");
    }

    return JSON.parse(text) as RoomAvailabilityResponse;
  } catch (error) {
    console.warn(
      "[libcal] Falling back to mock room availability:",
      error instanceof Error ? error.message : String(error)
    );
    return buildMockRoomAvailability(slug, date);
  }
}
