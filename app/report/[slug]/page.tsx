"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { LocationRow, isSupabaseConfigured, supabase } from "@/lib/supabase";

// temp url
const PROJECT_URL =
  "https://swan-hacks-spring-2026.devpost.com/?ref_content=default&ref_feature=challenge&ref_medium=portfolio";

type Level = 1 | 2 | 3 | 4 | 5;

type LoadState = "loading" | "ready" | "not-found" | "config-error" | "error";

function asLevel(value: string): Level {
  const numberValue = Number(value);
  if (numberValue <= 1) return 1;
  if (numberValue === 2) return 2;
  if (numberValue === 3) return 3;
  if (numberValue === 4) return 4;
  return 5;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ReportPage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => decodeURIComponent(params.slug ?? ""), [params.slug]);

  const [location, setLocation] = useState<LocationRow | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [crowd, setCrowd] = useState<Level>(3);
  const [noise, setNoise] = useState<Level>(3);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocation() {
      setError(null);
      setLoadState("loading");

      if (!isSupabaseConfigured || !supabase) {
        setLoadState("config-error");
        return;
      }

      const { data, error: locationError } = await supabase
        .from("locations")
        .select("id, slug, name, category")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;

      if (locationError) {
        setError(locationError.message);
        setLoadState("error");
        return;
      }

      if (!data) {
        setLoadState("not-found");
        return;
      }

      setLocation(data as LocationRow);
      setLoadState("ready");
    }

    loadLocation();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function submitReport() {
    if (!location || !supabase) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("reports").insert({
      location_id: location.id,
      crowd_level: crowd,
      noise_level: noise,
      anonymous_session_id: null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (loadState === "loading") {
    return (
      <main className="page-shell">
        <section className="card center-card">
          <p className="eyebrow">CySense</p>
          <h1>Loading location</h1>
          <p className="muted">Getting the report page ready.</p>
          <div className="loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  if (loadState === "config-error") {
    return (
      <main className="page-shell">
        <section className="card center-card">
          <p className="eyebrow">Setup needed</p>
          <h1>Supabase is not connected</h1>
          <p className="muted">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the project environment variables.
          </p>
        </section>
      </main>
    );
  }

  if (loadState === "not-found") {
    return (
      <main className="page-shell">
        <section className="card center-card">
          <p className="eyebrow">CySense</p>
          <h1>Location not found</h1>
          <p className="muted">
            We could not find a CySense location for “{slugToTitle(slug)}”. The QR code may be old or mistyped.
          </p>
        </section>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="page-shell">
        <section className="card center-card">
          <p className="eyebrow">CySense</p>
          <h1>Could not load</h1>
          <p className="notice error">{error ?? "Something went wrong loading this location."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="card">
        <div className="top-row">
          <div>
            <p className="eyebrow">Quick report</p>
            <h1 className="location-title">{location?.name}</h1>
          </div>
          {location?.category && <span className="category-pill">{location.category}</span>}
        </div>

        <div className="gold-rule" />

        {submitted ? (
          <div className="success-panel">
            <div className="success-icon">✓</div>
            <h1>Thanks for the report.</h1>
            <p className="muted">
              Your anonymous report helps other students find calmer spaces on campus.
            </p>
            <p className="muted">
              Want to find quieter places around campus too?
            </p>

            <a className="secondary-button" href={PROJECT_URL} target="_blank" rel="noreferrer">
              Check out CySense
            </a>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setSubmitted(false);
                setError(null);
              }}
            >
              Submit another report
            </button>
          </div>
        ) : (
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              submitReport();
            }}
          >
            <p className="muted">
              Share what this space feels like right now. No account needed.
            </p>

            <div className="slider-grid">
              <SliderCard
                label="Crowd"
                value={crowd}
                topCue="Packed"
                bottomCue="Empty"
                onChange={setCrowd}
              />
              <SliderCard
                label="Audio"
                value={noise}
                topCue="Loud"
                bottomCue="Silent"
                onChange={setNoise}
              />
            </div>

            <p className="help-text">
              Reports are anonymous and only store crowd and audio levels for this location.
            </p>

            {error && <p className="notice error">{error}</p>}

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit anonymous report"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function SliderCard({
  label,
  value,
  topCue,
  bottomCue,
  onChange,
}: {
  label: string;
  value: Level;
  topCue: string;
  bottomCue: string;
  onChange: (value: Level) => void;
}) {
  return (
    <label className="slider-card">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}</span>
      </div>
      <div className="range-wrap">
        <input
          className="range"
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          aria-label={`${label} level`}
          onChange={(event) => onChange(asLevel(event.target.value))}
        />
        <div className="range-cues">
          <span>{bottomCue}</span>
          <span>{topCue}</span>
        </div>
      </div>
    </label>
  );
}
