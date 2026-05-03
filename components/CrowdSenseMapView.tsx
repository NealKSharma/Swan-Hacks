import React, { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { levelLabel } from "@/utils/formatting";
import type { CrowdLevel, Hotspot, SensorySummary } from "@/types";

interface CrowdSenseMapViewProps {
  hotspots: Hotspot[];
  levelsByZone: Map<string, CrowdLevel>;
  summariesByZone?: Map<string, SensorySummary>;
  /**
   * Fired only when the user explicitly asks to open a location's detail
   * page — i.e. taps the "Tap again to open details" hint inside an open
   * popup. Selection / deselection / zoom are handled inside the WebView
   * so we never tear down the map when state changes.
   */
  onHotspotOpen: (hotspotId: string) => void;
}

export function CrowdSenseMapView({
  hotspots,
  levelsByZone,
  summariesByZone,
  onHotspotOpen,
}: CrowdSenseMapViewProps) {
  const html = useMemo(
    () =>
      buildMapHtml({
        hotspots: hotspots.map((hotspot) => ({
          ...hotspot,
          level: levelsByZone.get(hotspot.id)?.level ?? "Empty",
          summary: summariesByZone?.get(hotspot.id) ?? null,
        })),
      }),
    [hotspots, levelsByZone, summariesByZone]
  );

  // react-native-webview's onMessage prop can capture a stale closure of the
  // initial render — newer instances of the inline arrow function don't
  // always replace the older one. Route the call through a ref so we always
  // invoke the live function regardless of render count.
  const onHotspotOpenRef = useRef(onHotspotOpen);
  useEffect(() => {
    onHotspotOpenRef.current = onHotspotOpen;
  }, [onHotspotOpen]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    function handleMessage(event: MessageEvent) {
      const data = parseMapMessage(event.data);
      if (data?.type === "open") onHotspotOpenRef.current?.(data.id);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.mapShell}>
        {/*
          React Native Web can host an iframe here, while native uses WebView.
          The source is local HTML; map tiles still come from OpenStreetMap.
        */}
        {createWebIframe(html)}
      </View>
    );
  }

  return (
    <View style={styles.mapShell}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={(event) => {
          const data = parseMapMessage(event.nativeEvent.data);
          if (data?.type === "open") onHotspotOpenRef.current?.(data.id);
        }}
      />
    </View>
  );
}

function createWebIframe(html: string) {
  return React.createElement("iframe", {
    srcDoc: html,
    style: {
      border: 0,
      width: "100%",
      height: "100%",
      display: "block",
    },
    title: "CrowdSense hotspot map",
  });
}

function parseMapMessage(value: unknown): { type: "open"; id: string } | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.type === "open" && typeof parsed.id === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

// Markers are uniformly cardinal red — the brand colour. Crowd intensity
// is communicated through the popup (Noise / Crowd labels), not the marker.
function markerColor(_level: CrowdLevel["level"]) {
  return "#C8102E";
}

function buildMapHtml({
  hotspots,
  selectedHotspotId,
}: {
  hotspots: Array<
    Hotspot & {
      level: CrowdLevel["level"];
      summary: SensorySummary | null;
    }
  >;
}) {
  const mapCenter =
    hotspots.length > 0
      ? [hotspots[0].latitude, hotspots[0].longitude]
      : [42.0267, -93.6465];

  const safeHotspots = JSON.stringify(
    hotspots.map((hotspot) => ({
      id: hotspot.id,
      name: hotspot.name,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      radiusMeters: hotspot.radiusMeters,
      level: hotspot.level,
      noiseText: levelLabel("noise", hotspot.summary?.noise ?? null),
      crowdText: levelLabel("crowd", hotspot.summary?.crowd ?? null),
      color: markerColor(hotspot.level),
    }))
  );

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #F2EEE7; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .hotspot-marker {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,.22);
    }
    .popup-title {
      font-weight: 800;
      color: #1A1F2A;
      margin-bottom: 4px;
    }
    .popup-line {
      color: #1A1F2A;
      font-size: 13px;
      line-height: 18px;
      font-weight: 600;
    }
    .popup-hint {
      color: #C8102E;
      font-size: 12px;
      line-height: 16px;
      font-weight: 700;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const hotspots = ${safeHotspots};
    const map = L.map('map', {
      zoomControl: false,
      maxBoundsViscosity: 1.0,
    }).setView(${JSON.stringify(mapCenter)}, 17);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // The only message the React side cares about is "open this location's
    // detail page", fired from the popup hint text. Selection / deselection
    // / zoom are handled entirely inside this script.
    function sendOpen(id) {
      const payload = JSON.stringify({ type: 'open', id });
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
      if (window.parent) window.parent.postMessage(payload, '*');
    }

    const bounds = [];
    const markers = [];
    hotspots.forEach((hotspot) => {
      const latlng = [hotspot.latitude, hotspot.longitude];
      bounds.push(latlng);

      const ring = L.circle(latlng, {
        radius: hotspot.radiusMeters,
        color: hotspot.color,
        fillColor: hotspot.color,
        fillOpacity: 0.05,
        weight: 1,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: '<div class="hotspot-marker" style="background:' + hotspot.color + '"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const popupHtml =
        '<div class="popup-title">' + hotspot.name + '</div>' +
        '<div class="popup-line">Noise: ' + hotspot.noiseText + '</div>' +
        '<div class="popup-line">Crowd: ' + hotspot.crowdText + '</div>' +
        '<div class="popup-hint" data-hotspot-id="' + hotspot.id + '">Tap again to open details.</div>';

      const marker = L.marker(latlng, { icon })
        .addTo(map)
        .bindTooltip(hotspot.name, { direction: 'top', offset: [0, -12] })
        .bindPopup(popupHtml);

      // Selecting a marker zooms in on it.
      marker.on('click', () => {
        suppressDeselect = true;
        map.flyTo(marker.getLatLng(), Math.max(initialZoom + 1, 18), { duration: 0.35 });
        // suppress the empty-area deselect listener that would also fire on
        // the same tap, and let popupclose-from-other-marker pass through
        setTimeout(() => { suppressDeselect = false; }, 80);
      });

      // After popup mounts, wire the hint text to fire 'open' (navigate)
      // and stop the click bubbling up to the map (which would deselect).
      marker.on('popupopen', () => {
        const popupEl = marker.getPopup().getElement();
        if (!popupEl) return;
        const hint = popupEl.querySelector('.popup-hint');
        if (!hint) return;
        L.DomEvent.disableClickPropagation(hint);
        hint.addEventListener('click', () => sendOpen(hotspot.id));
      });

      markers.push({ marker, ring });
    });

    // Compute the initial center + zoom synchronously so the pan-lock and
    // zoom-out-on-deselect both have a stable target.
    let initialCenter;
    let initialZoom;
    if (bounds.length > 1) {
      const latLngBounds = L.latLngBounds(bounds);
      initialCenter = latLngBounds.getCenter();
      initialZoom = Math.min(17, map.getBoundsZoom(latLngBounds, false, [34, 34]));
    } else {
      initialCenter = ${JSON.stringify(mapCenter)};
      initialZoom = 17;
    }

    map.setView(initialCenter, initialZoom, { animate: false });
    map.setMinZoom(initialZoom);

    // Lock panning to the rendered bounds so the user can never drag the
    // map outside the campus frame. At initial zoom the map already fills
    // the bounds, so panning is essentially disabled. When zoomed in the
    // user can pan around inside the rectangle freely.
    map.setMaxBounds(map.getBounds());

    // Deselection: clicking on empty map area or the popup's X (which fires
    // popupclose). suppressDeselect prevents this from firing on the same
    // tap that selected a marker, or when switching from one marker to
    // another (the second marker's click sets the flag first).
    let suppressDeselect = false;

    function deselectAndRestore() {
      map.closePopup();
      map.flyTo(initialCenter, initialZoom, { duration: 0.35 });
    }

    map.on('click', () => {
      if (suppressDeselect) return;
      deselectAndRestore();
    });

    map.on('popupclose', () => {
      // popupclose fires both for X-button taps and when another marker is
      // about to open. The flag is true in the latter case.
      if (suppressDeselect) return;
      // Defer slightly: if a different marker is about to open, its click
      // handler will set suppressDeselect first.
      setTimeout(() => {
        if (suppressDeselect) return;
        if (map.getZoom() > initialZoom) {
          map.flyTo(initialCenter, initialZoom, { duration: 0.35 });
        }
      }, 30);
    });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  mapShell: {
    height: 430,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E2D6",
    backgroundColor: "#F2EEE7",
  },
});
