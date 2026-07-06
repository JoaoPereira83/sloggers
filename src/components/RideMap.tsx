import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import type { RideRider } from "@/lib/ride-types";

type RideMapProps = {
  riders: RideRider[];
  selectedRiderId: string | null;
  currentRiderId: string | null;
  onSelectRider: (riderId: string) => void;
};

export function RideMap({
  riders,
  selectedRiderId,
  currentRiderId,
  onSelectRider,
}: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());

  const mappableRiders = riders.filter(
    (rider) => rider.latitude != null && rider.longitude != null,
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([52.252, -1.39], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncMarkers() {
      const map = mapRef.current;
      if (!map) return;

      const L = await import("leaflet");
      if (cancelled) return;

      const nextIds = new Set(mappableRiders.map((rider) => rider.id));

      for (const [id, marker] of markersRef.current.entries()) {
        if (!nextIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }

      for (const rider of mappableRiders) {
        const lat = rider.latitude!;
        const lng = rider.longitude!;
        const isSelected = rider.id === selectedRiderId;
        const isYou = rider.id === currentRiderId;
        const label = isYou ? `${rider.name} (you)` : rider.name;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            transform: translate(-50%, -50%);
            background:${isSelected ? "#c96bff" : isYou ? "#ffffff" : "#5c2d82"};
            color:${isSelected || !isYou ? "#2a1238" : "#5c2d82"};
            border:2px solid ${isSelected ? "#ffffff" : "#c96bff"};
            border-radius:9999px;
            padding:6px 10px;
            font:600 12px/1.2 Barlow, sans-serif;
            box-shadow:0 8px 24px rgba(42,18,56,.25);
            white-space:nowrap;
          ">${label}</div>`,
          iconSize: [0, 0],
        });

        const existing = markersRef.current.get(rider.id);
        if (existing) {
          existing.setLatLng([lat, lng]);
          existing.setIcon(icon);
        } else {
          const marker = L.marker([lat, lng], { icon }).addTo(map);
          marker.on("click", () => onSelectRider(rider.id));
          markersRef.current.set(rider.id, marker);
        }
      }

      if (selectedRiderId) {
        const selected = mappableRiders.find((rider) => rider.id === selectedRiderId);
        if (selected) {
          map.setView([selected.latitude!, selected.longitude!], Math.max(map.getZoom(), 13), {
            animate: true,
          });
          return;
        }
      }

      if (mappableRiders.length === 1) {
        map.setView([mappableRiders[0].latitude!, mappableRiders[0].longitude!], 13, {
          animate: true,
        });
        return;
      }

      if (mappableRiders.length > 1) {
        const bounds = L.latLngBounds(
          mappableRiders.map((rider) => [rider.latitude!, rider.longitude!] as [number, number]),
        );
        map.fitBounds(bounds.pad(0.2), { animate: true });
      }
    }

    void syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [mappableRiders, selectedRiderId, currentRiderId, onSelectRider]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-muted/30">
      <div ref={containerRef} className="h-[420px] w-full" />
      {mappableRiders.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 px-6 text-center text-sm text-muted-foreground">
          Waiting for riders to share their location…
        </div>
      ) : null}
    </div>
  );
}
