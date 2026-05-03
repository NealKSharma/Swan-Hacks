# CySense QR Report Web App

A tiny mobile-first Next.js app for QR code reporting. It opens URLs like `/report/parks-library`, looks up the matching location in Supabase, and inserts anonymous crowd/audio reports into the same `reports` table your mobile app reads.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your Supabase project URL and anon key:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then open:

```text
http://localhost:3000/report/parks-library
http://localhost:3000/report/student-innovation-center
```

## Deploy on Vercel

1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add these environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## QR code links

After deploying, create QR codes that point to URLs like:

```text
https://your-vercel-domain.vercel.app/report/parks-library
https://your-vercel-domain.vercel.app/report/student-innovation-center
```

The app uses location slugs, not UUIDs. It queries `locations.slug`, gets the UUID, and inserts that UUID into `reports.location_id`.
