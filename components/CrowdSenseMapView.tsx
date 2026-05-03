import React, { useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { levelLabel } from "@/utils/formatting";
import type { CrowdLevel, Hotspot, SensorySummary } from "@/types";

interface CrowdSenseMapViewProps {
  hotspots: Hotspot[];
  levelsByZone: Map<string, CrowdLevel>;
  summariesByZone?: Map<string, SensorySummary>;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  selectedHotspotId: string | null;
  onHotspotPress: (hotspotId: string) => void;
}

export function CrowdSenseMapView({
  hotspots,
  levelsByZone,
  summariesByZone,
  currentLocation,
  selectedHotspotId,
  onHotspotPress,
}: CrowdSenseMapViewProps) {
  const html = useMemo(
    () =>
      buildMapHtml({
        hotspots: hotspots.map((hotspot) => ({
          ...hotspot,
          level: levelsByZone.get(hotspot.id)?.level ?? "Quiet",
          summary: summariesByZone?.get(hotspot.id) ?? null,
        })),
        currentLocation,
        selectedHotspotId,
      }),
    [currentLocation, hotspots, levelsByZone, selectedHotspotId, summariesByZone]
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    function handleMessage(event: MessageEvent) {
      const data = parseMapMessage(event.data);
      if (data?.type === "hotspot") onHotspotPress(data.id);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onHotspotPress]);

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
          if (data?.type === "hotspot") onHotspotPress(data.id);
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

function parseMapMessage(value: unknown): { type: "hotspot"; id: string } | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.type === "hotspot" && typeof parsed.id === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function markerColor(level: CrowdLevel["level"]) {
  switch (level) {
    case "Quiet":
      return "#2F855A";
    case "Calm":
      return "#3F8F6E";
    case "Busy":
      return "#C8A04A";
    case "Crowded":
      return "#B86E3C";
    case "Overcrowded":
      return "#9C2A39";
  }
}

function buildMapHtml({
  hotspots,
  currentLocation,
  selectedHotspotId,
}: {
  hotspots: Array<
    Hotspot & {
      level: CrowdLevel["level"];
      summary: SensorySummary | null;
    }
  >;
  currentLocation: { latitude: number; longitude: number } | null;
  selectedHotspotId: string | null;
}) {
  const mapCenter = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : selectedHotspotId
      ? (() => {
          const selected = hotspots.find((hotspot) => hotspot.id === selectedHotspotId);
          return selected
            ? [selected.latitude, selected.longitude]
            : hotspots.length > 0
              ? [hotspots[0].latitude, hotspots[0].longitude]
              : [42.0267, -93.6465];
        })()
    : hotspots.length > 0
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
      status: hotspot.summary?.status ?? "Quiet",
      noiseText: levelLabel("noise", hotspot.summary?.noise ?? null),
      crowdText: levelLabel("crowd", hotspot.summary?.crowd ?? null),
      color: markerColor(hotspot.level),
      selected: hotspot.id === selectedHotspotId,
    }))
  );

  const safeLocation = JSON.stringify(currentLocation);

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
    .hotspot-marker.selected {
      width: 22px;
      height: 22px;
      border: 3px solid #1A1F2A;
    }
    .user-marker {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #1A1F2A;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,.24);
    }
    .popup-title {
      font-weight: 800;
      color: #1A1F2A;
      margin-bottom: 4px;
    }
    .popup-line {
      color: #5A6472;
      font-size: 12px;
      line-height: 16px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const hotspots = ${safeHotspots};
    const currentLocation = ${safeLocation};
    const map = L.map('map', { zoomControl: false }).setView(${JSON.stringify(mapCenter)}, 17);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    function sendHotspot(id) {
      const payload = JSON.stringify({ type: 'hotspot', id });
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
      if (window.parent) window.parent.postMessage(payload, '*');
    }

    const bounds = [];
    let selectedMarker = null;
    hotspots.forEach((hotspot) => {
      const latlng = [hotspot.latitude, hotspot.longitude];
      bounds.push(latlng);
      L.circle(latlng, {
        radius: hotspot.radiusMeters,
        color: hotspot.color,
        fillColor: hotspot.color,
        fillOpacity: hotspot.selected ? 0.14 : 0.05,
        weight: hotspot.selected ? 2 : 1
      }).addTo(map).on('click', () => sendHotspot(hotspot.id));

      const icon = L.divIcon({
        className: '',
        html: '<div class="hotspot-marker ' + (hotspot.selected ? 'selected' : '') + '" style="background:' + hotspot.color + '"></div>',
        iconSize: hotspot.selected ? [22, 22] : [14, 14],
        iconAnchor: hotspot.selected ? [11, 11] : [7, 7]
      });
      const marker = L.marker(latlng, { icon })
        .addTo(map)
        .bindTooltip(hotspot.name + ' - ' + hotspot.level, { direction: 'top', offset: [0, -12] })
        .bindPopup(
          '<div class="popup-title">' + hotspot.name + '</div>' +
          '<div class="popup-line">Status: ' + hotspot.status + '</div>' +
          '<div class="popup-line">Noise: ' + hotspot.noiseText + '</div>' +
          '<div class="popup-line">Crowd: ' + hotspot.crowdText + '</div>' +
          '<div class="popup-line">Quiet level: ' + quietLevelText(hotspot.level) + '</div>' +
          '<div class="popup-line">Crowdedness: ' + crowdednessText(hotspot.level) + '</div>' +
          '<div class="popup-line">Tap again to open details.</div>'
        )
        .on('click', () => sendHotspot(hotspot.id));
      if (hotspot.selected) selectedMarker = marker;
    });

    if (currentLocation) {
      const userLatLng = [currentLocation.latitude, currentLocation.longitude];
      bounds.push(userLatLng);
      L.marker(userLatLng, {
        icon: L.divIcon({
          className: '',
          html: '<div class="user-marker"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(map).bindTooltip('You are here', { direction: 'top', offset: [0, -10] });
    }

    if (selectedMarker) {
      selectedMarker.openPopup();
      map.setView(selectedMarker.getLatLng(), 17);
    } else if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 17);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 17 });
    }

    function quietLevelText(level) {
      if (level === 'Quiet') return 'very quiet';
      if (level === 'Calm') return 'calm';
      if (level === 'Busy') return 'mixed';
      if (level === 'Crowded') return 'limited';
      return 'low';
    }

    function crowdednessText(level) {
      if (level === 'Quiet') return 'very low';
      if (level === 'Calm') return 'light';
      if (level === 'Busy') return 'busy';
      if (level === 'Crowded') return 'crowded';
      return 'over crowded';
    }
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
