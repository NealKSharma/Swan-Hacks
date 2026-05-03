# CySense

CySense is a campus app designed to help students at Iowa State University find spaces that match their comfort level. It provides real-time and past information about noise, crowd levels, seating, and lighting, so students can decide where to study or relax. The app is especially helpful for students who feel overwhelmed in busy environments, but it works for anyone looking for a quieter or more focused space. By using simple, anonymous reports, CySense makes it easier to move around campus in a way that feels more comfortable and manageable. 

---

## Features

- **Live Campus Conditions** - See real time updates on noise levels, crowd density, seating availability, and lighting across different campus locations.
- **Interactive Map and List View**  - Explore spaces using a map with highlighted hot zones or switch to a list view to quickly browse and compare locations. Filter by categories like academic buildings, dining, recreation, and outdoor areas.
- **Location Details** - Tap on any location to view detailed information including current conditions, popular times, recent anonymous reports, and an overall sensory status.
- **Crowdsourced Reports** - Students can submit quick, anonymous reports about their surroundings using simple sliders. These reports help keep data fresh and accurate for everyone.
- **Sound Detection** - Users can optionally measure the current noise level using their phone’s microphone. The app only captures an average sound level and does not store any audio.
- **QR Code Integration** - Locations can be linked to QR codes around campus so students can instantly view conditions or submit a report by scanning.
- **Personalized Recommendations** - The home page highlights the best spots based on current conditions and the user’s preferences, making it easier to find a comfortable place quickly.
- **User Preferences** - Customize settings like maximum noise and crowd levels, prioritize quieter spaces, and save preferred locations to tailor recommendations.
- **Historical Trends** - View predicted busy times for each location based on past data, helping students plan ahead and avoid peak hours.
- **Privacy First Design** - No personal tracking, no stored audio, and all reports are anonymous. Data is aggregated to protect user privacy while still being useful.

---

## Pages

**Home Page** <br>
The home page gives a quick overview of campus conditions. It highlights the best quiet spot at the moment, shows a few recommended locations, and includes basic privacy information so users understand how their data is handled.

**Spaces Page** <br>
This page is the core of the app. It opens with a map that shows campus buildings and highlights how busy or loud each space is based on live data from the backend. Users can tap on a building to see more details like current noise, crowd level, popular times based on past data, recent anonymous reports, and an option to submit a report.

There is also a list view option that shows all locations in a simple scrollable format. In this view, users can sort spaces by categories like academic buildings, recreation centers, dining, or outdoor areas. Each location still shows key details and allows users to submit reports.

When submitting a report, users can adjust sliders for crowd and noise levels. There is also an option to quickly measure sound using the phone’s microphone for a couple of seconds. The app only captures the average noise level and does not store any audio. Once submitted, the report updates the location’s data by combining it with recent reports.

**Preferences Page** <br>
This page lets users customize their experience. They can set their preferred maximum noise and crowd levels, choose to prioritize quieter spaces, and select favorite locations. These preferences are used to recommend better spots on the home page. Users can also manage permissions like notifications, location access, and microphone access here.

**About Page** <br>
The about page explains what CySense is, how it works, and how it protects user privacy. It also gives a quick look at future ideas like better predictions, more data sources, and expanded features.

---

## Install

```bash
cd Swan-Hacks
npm install
npm install -g supabase
```

---

## Run locally

```bash
npx expo start
npx expo start --ios
npx expo start --web
```

Out of the box you will see mock ISU data. The Student Innovation Center detail
page also shows mock room openings until the LibCal bridge is deployed.

---

## Tech Stack

Expo React Native with TypeScript for the frontend, Expo Router for navigation, and Supabase for the backend and database. The app is designed to work on both mobile and web using a shared codebase.

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

## Team

**Trice Buchanan**

**Devank Uppal**

**Neal Kaushik Sharma**