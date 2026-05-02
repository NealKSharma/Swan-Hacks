# CySense

A sensory-aware campus companion for Iowa State University. It helps students
find calmer, less crowded, more usable spaces using a mix of crowdsourced
reports, opt-in location signals for zone presence, on-device decibel readings,
and live study-room openings where LibCal data is available.

Built for Swan Hacks. Privacy-first by design.

### How privacy works

CySense never requires an account and never stores who submitted a report.
Three categories of input feed the app, and the two that touch the device
are strictly opt-in:

1. **Anonymous reports** — what students manually share about a space (noise,
   crowd, seating, lighting, optional comment). No identity is attached.
2. **Opt-in location** — if the user grants permission, we resolve their
   device's location to a coarse campus zone (e.g. "Parks Library"). We do
   not store exact coordinates and we do not store the path between zones.
   Tracking is off by default and the app works fine without it.
3. **On-device decibel** — when a report is submitted, we can measure the
   ambient decibel level locally on the phone. Only the number leaves the
   device. No raw audio is ever recorded, transmitted, or stored.

If a user declines location or microphone access, the app still works; only
manual reports contribute. That is intentional.

---

## What's in this repo

```text
app/                Expo Router screens (Home, Locations, Detail, Preferences, About)
components/         Reusable UI (cards, badges, report form, room availability)
lib/                Supabase client + data-source layer + LibCal client wrapper
utils/              Sensory scoring, recommendations, formatting
constants/          Theme + ISU mock data + LibCal config
types/              Shared TypeScript types
supabase/           schema.sql and seed.sql to paste into Supabase
supabase/functions/ Edge Functions, including the LibCal room-availability bridge
```

The data layer automatically falls back to mock data when Supabase is not
configured, so the app is still demoable with zero setup.

---

## 1. Install

```bash
cd Swan-Hacks
npm install
```

If you do not have the Supabase CLI yet:

```bash
npm install -g supabase
```

---

## 2. Run locally

```bash
npx expo start
npx expo start --ios
npx expo start --web
```

Out of the box you will see mock ISU data. The Student Innovation Center detail
page also shows mock room openings until the LibCal bridge is deployed.

---

## 3. Set up Supabase

1. Create a project at <https://supabase.com>.
2. In the Supabase SQL editor, paste and run [supabase/schema.sql](supabase/schema.sql).
3. Paste and run [supabase/seed.sql](supabase/seed.sql).
4. In Project Settings -> API, copy the Project URL and `anon` key.
5. Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

6. Deploy the LibCal bridge function:

```bash
supabase functions deploy libcal-availability
```

7. Restart Expo.

The schema adds optional LibCal metadata on `locations`, and the edge function
fetches the public Iowa State LibCal page, replays the hidden availability-grid
POST, and returns normalized room slots to the app.

---

## 4. LibCal integration

CySense does not attempt to complete room bookings inside the app. It reads
public availability from LibCal and links the user out to the official booking
page to finish the reservation.

Current supported location:

- Student Innovation Center: `https://sictr-iastate.libcal.com/spaces?lid=15606&gid=38061&c=0`

The reverse-engineered bridge lives in
[supabase/functions/libcal-availability/index.ts](supabase/functions/libcal-availability/index.ts).
It is intentionally isolated on the backend so the Expo client does not depend
directly on undocumented third-party endpoints.

---

## 5. Demo flow

1. Open the app. Home shows recommended quiet spots.
2. Compare Parks Library with Student Innovation Center.
3. Open Student Innovation Center and show the new **Study rooms right now** card.
4. Tap **Reserve in LibCal** to hand off to the official booking flow.
5. Submit an anonymous sensory report to show the original CySense loop still works.

---

## 6. What we deliberately did not build

- Production auth
- Real background location tracking
- Audio recording
- Complex maps
- ML-based predictions
- In-app booking against LibCal's private endpoint

Keeping those out of the MVP is deliberate. The app stays demo-ready without
overengineering.

---

## Custom icons

The app uses inline Lucide-style SVG icons via `react-native-svg`, mapped through
`components/Icon.tsx`. To swap any icon for a custom design:

1. Drop your SVG file at `assets/icons/<name>.svg` (see "icon names" below).
   Stick to a 24×24 viewBox with stroke-based artwork to match the rest.
2. In `components/Icon.tsx`, find the matching `Icon<Name>` const and replace
   its body with:

   ```tsx
   import Custom from "@/assets/icons/<name>.svg";
   const IconQuiet: ComponentType<InternalProps> = (p) => (
     <Custom width={p.size} height={p.size} stroke={p.color} strokeWidth={p.strokeWidth} />
   );
   ```

The `react-native-svg-transformer` config in `metro.config.js` makes any
`.svg` import work as a React component automatically.

### Icon names

| Filename               | Used for                                |
| ---------------------- | --------------------------------------- |
| `metric-noise.svg`     | Metric badge — Noise                    |
| `metric-crowd.svg`     | Metric badge — Crowd                    |
| `metric-seating.svg`   | Metric badge — Seating                  |
| `metric-lighting.svg`  | Metric badge — Lighting                 |
| `chevron-right.svg`    | Forward CTAs / "Read more" / arrows     |
| `nav-home.svg`         | Tab bar — Home                          |
| `nav-compass.svg`      | Tab bar — Spaces                        |
| `nav-filter.svg`       | Tab bar — Preferences                   |
| `nav-info.svg`         | Tab bar — About                         |

All SVGs use `fill="currentColor"` so they tint via the `color` prop on `<Icon>`.

## File reference

- [lib/dataSource.ts](lib/dataSource.ts) - app-facing read/write surface
- [lib/libcal.ts](lib/libcal.ts) - client wrapper for live room availability
- [constants/libcal.ts](constants/libcal.ts) - LibCal mappings and mock room data
- [supabase/schema.sql](supabase/schema.sql) - tables and RLS policies
- [supabase/seed.sql](supabase/seed.sql) - ISU seed data plus LibCal metadata
- [supabase/functions/libcal-availability/index.ts](supabase/functions/libcal-availability/index.ts) - reverse-engineered LibCal bridge
