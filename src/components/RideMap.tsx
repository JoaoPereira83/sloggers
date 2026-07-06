import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import type { RideRider } from "@/lib/ride-types";

type RideMapProps = {
  riders: RideRider[];
  selectedRiderId: string | null;
  currentRiderId: string | null;
  onSelectRider: (riderId: string) => void;
};

function bikeMarkerHtml(options: {
  label: string;
  fill: string;
  stroke: string;
  labelColor: string;
  selected: boolean;
}) {
  const { label, fill, stroke, labelColor, selected } = options;

  return `<div style="
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    transform:translate(-50%, calc(-100% - 4px));
    pointer-events:none;
  ">
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:${selected ? 44 : 40}px;
      height:${selected ? 44 : 40}px;
      background:${fill};
      border:2px solid ${stroke};
      border-radius:9999px;
      box-shadow:0 8px 24px rgba(42,18,56,.28);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${labelColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="18.5" cy="17.5" r="3.5"></circle>
        <circle cx="5.5" cy="17.5" r="3.5"></circle>
        <circle cx="15" cy="5" r="1"></circle>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
      </svg>
    </div>
    <div style="
      background:rgba(255,255,255,.96);
      color:${labelColor};
      border:1px solid ${stroke};
      border-radius:9999px;
      padding:3px 8px;
      font:600 11px/1.2 Barlow, sans-serif;
      box-shadow:0 4px 12px rgba(42,18,56,.18);
      white-space:nowrap;
      pointer-events:auto;
    ">${label}</div>
  </div>`;
}

export function RideMap({
  riders,
  selectedRiderId,
  currentRiderId,
  onSelectRider,
}: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const initialFrameDoneRef = useRef(false);
  const lastFollowedRiderRef = useRef<string | null>(null);

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
      initialFrameDoneRef.current = false;
      lastFollowedRiderRef.current = null;
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
          html: bikeMarkerHtml({
            label,
            fill: isSelected ? "#c96bff" : isYou ? "#ffffff" : "#5c2d82",
            stroke: isSelected ? "#ffffff" : "#c96bff",
            labelColor: isSelected || !isYou ? "#2a1238" : "#5c2d82",
            selected: isSelected,
          }),
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
    }

    void syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [mappableRiders, selectedRiderId, currentRiderId, onSelectRider]);

  useEffect(() => {
    let cancelled = false;

    async function syncViewport() {
      const map = mapRef.current;
      if (!map || mappableRiders.length === 0 || cancelled) return;

      const L = await import("leaflet");
      if (cancelled) return;

      if (selectedRiderId) {
        const selected = mappableRiders.find((rider) => rider.id === selectedRiderId);
        if (!selected) return;

        const lat = selected.latitude!;
        const lng = selected.longitude!;
        const zoom = map.getZoom();

        if (lastFollowedRiderRef.current !== selectedRiderId) {
          map.setView([lat, lng], zoom, { animate: true });
          lastFollowedRiderRef.current = selectedRiderId;
          return;
        }

        map.panTo([lat, lng], { animate: true });
        return;
      }

      lastFollowedRiderRef.current = null;

      if (initialFrameDoneRef.current) return;

      if (mappableRiders.length === 1) {
        map.setView([mappableRiders[0].latitude!, mappableRiders[0].longitude!], 14, {
          animate: false,
        });
      } else {
        const bounds = L.latLngBounds(
          mappableRiders.map((rider) => [rider.latitude!, rider.longitude!] as [number, number]),
        );
        map.fitBounds(bounds.pad(0.2), { animate: false });
      }

      initialFrameDoneRef.current = true;
    }

    void syncViewport();

    return () => {
      cancelled = true;
    };
  }, [mappableRiders, selectedRiderId]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30 sm:rounded-3xl">
      <div ref={containerRef} className="h-[min(58dvh,32rem)] min-h-[280px] w-full sm:h-[420px] md:h-[480px]" />
      {mappableRiders.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 px-6 text-center text-sm text-muted-foreground">
          Waiting for riders to share their location…
        </div>
      ) : null}
    </div>
  );
}
