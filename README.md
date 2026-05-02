# CySense

A sensory-aware campus companion for Iowa State University. Helps students find
calmer, less crowded, more usable spaces using crowdsourced live and historical
information about noise, crowd density, seating, and lighting.

Built for Swan Hacks. Privacy-first. No tracking.

---

## What's in this repo

```
app/                Expo Router screens (Home, Locations, Detail, Preferences, About)
components/         Reusable UI (LocationCard, MetricBadge, SensoryStatusPill, TrendBars, ReportForm, …)
lib/                Supabase client + data-source layer with auto-fallback to mock
utils/              Sensory scoring, recommendations, formatting
constants/          Theme + ISU mock data
types/              Shared TypeScript types
supabase/           schema.sql and seed.sql to paste into Supabase
```

The data layer (`lib/dataSource.ts`) automatically falls back to mock data when
Supabase env vars are blank, so the app is fully demo-able with **zero setup**.

---

## 1. Install

```bash
cd Swan-Hacks
npm install
```

If you don't have the Expo / EAS CLIs yet:

```bash
npm install -g eas-cli
```

---

## 2. Run locally

```bash
# Phone (Expo Go) — scan the QR code with the Expo Go app
npx expo start

# iOS simulator
npx expo start --ios

# Web (great as a demo backup)
npx expo start --web
```

Out of the box you'll see mock ISU data. The Home screen shows a "Demo data —
Supabase not configured" chip so you know which mode you're in.

---

## 3. Set up Supabase (when you're ready)

1. Create a project at <https://supabase.com>.
2. In the Supabase SQL editor, paste and run `supabase/schema.sql`.
3. Paste and run `supabase/seed.sql` (creates 12 ISU locations + sample hourly trends).
4. In Project Settings → API, copy the Project URL and `anon` key.
5. Create a `.env` file in the project root:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

6. Restart `npx expo start`. The "Demo data" chip will disappear and the app
   will read/write through Supabase.

The schema enables Row Level Security with public read for `locations`,
`reports`, and `location_hourly_trends`, and an `anon`-friendly `INSERT` policy
on `reports` (only valid 1–5 levels accepted).

---

## 4. Deploy to TestFlight (EAS)

You said you have an Apple Developer account — here's the path. From the project
root:

```bash
# Sign in & link to your Expo account
eas login

# One-time: create the EAS project on Expo's side
eas init

# Build a production iOS binary signed for the App Store
eas build --platform ios --profile production
```

When prompted:

- **Apple Account** → log in with your developer credentials.
- **Bundle identifier** → `edu.iastate.cysense` (from `app.json`; change if you prefer).
- **Push notifications** → not needed for the MVP, skip if asked.

Once the build finishes, submit it:

```bash
eas submit --platform ios --latest
```

Open it on TestFlight from your iPhone. EAS handles the rest (provisioning,
signing, ASC upload).

> **Tip:** If you want a faster physical-device dev loop, build the
> `development` profile once with `eas build --platform ios --profile development`
> and run `npx expo start --dev-client`. You won't need TestFlight for daily
> dev work — only for the demo.

---

## 5. QR code deep links

Each location's detail page lives at `/location/[slug]` — for example:

```
https://cysense.app/location/parks-library
https://cysense.app/location/student-innovation-center
https://cysense.app/location/memorial-union
```

For the hackathon, generate QR codes with any tool you like, e.g.:

```bash
# macOS one-liner using qrencode (brew install qrencode)
qrencode -o parks-library.png "https://cysense.app/location/parks-library"
```

…or use <https://qr-code-generator.com>.

Two ways those URLs can open the app:

1. **Web (instant):** the URL opens the Expo Web build in the browser.
2. **iOS (Universal Links):** add the matching `apple-app-site-association`
   file at `https://cysense.app/.well-known/apple-app-site-association`
   pointing at your Team ID + bundle identifier. The route configuration
   (`app.json` → `ios.associatedDomains`) is already in place.

For the demo it's totally fine to use the web URL — that still tells the QR-on-the-wall
story end-to-end.

---

## 6. Demo script (the story to tell)

1. Open the app. Home shows "Best quiet spots now" — Parks Library is **Busy**, Student Innovation Center is **Quiet**.
2. Tap Parks Library → show the live status, popular-times bars, recent reports. "Too loud, let's check elsewhere."
3. Back → tap Student Innovation Center → **Quiet**, plenty of seating.
4. Walk to the printed QR code on a poster → scan → it opens directly to that location's page (web or app).
5. Tap **Submit a quick report** → slide noise/crowd/seating/lighting → submit → success state. The page updates immediately.
6. Open Preferences → flip "Prefer quieter spaces" → return to Home → recommendations re-rank.
7. Open About → walk through the privacy principles and future vision (decibel readers, opt-in density, route planning).

---

## 7. What we deliberately did NOT build

- Production auth.
- Real background location tracking.
- Audio recording.
- Maps with custom rendering.
- ML-based predictions.
- A full community discussion board (mentioned in About as future).

Keeping these out of the MVP is the point — the architecture is set up so any of
them can land later as feature work without restructuring.

---

## File reference

- `lib/supabase.ts` — Supabase client (treats blank/`YOUR_…` env values as not configured).
- `lib/dataSource.ts` — read/write surface used by every screen; auto-falls back to mock.
- `utils/sensoryScore.ts` — `summarizeReports()` produces score (0–100) + status label.
- `utils/recommendations.ts` — `rankLocations()` blends comfort score with user preferences.
- `constants/campusLocations.ts` — mock data mirrors the Supabase schema 1:1.
- `supabase/schema.sql` — tables + RLS policies.
- `supabase/seed.sql` — 12 ISU locations + weekday hourly trend curves.
