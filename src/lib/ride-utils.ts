import type { RideReportType } from "./ride-types";

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatLastSeen(updatedAt: string | null) {
  if (!updatedAt) return "No location yet";
  const seconds = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
  if (seconds < 15) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
}

const STOPPED_SPEED_KMH = 2;

function normalizeSpeedKmh(kmh: number) {
  if (kmh < STOPPED_SPEED_KMH) return 0;
  return Math.round(kmh * 10) / 10;
}

export function computeSpeedKmh(input: {
  previous: { latitude: number; longitude: number; updatedAt: string } | null;
  latitude: number;
  longitude: number;
  updatedAt: string;
  gpsSpeedKmh?: number | null;
}) {
  const { previous, latitude, longitude, updatedAt, gpsSpeedKmh } = input;

  if (gpsSpeedKmh != null && gpsSpeedKmh >= 0 && gpsSpeedKmh <= 80) {
    return normalizeSpeedKmh(gpsSpeedKmh);
  }

  if (!previous) return 0;

  const seconds =
    (new Date(updatedAt).getTime() - new Date(previous.updatedAt).getTime()) / 1000;
  if (seconds < 1) return null;

  const km = haversineKm(
    previous.latitude,
    previous.longitude,
    latitude,
    longitude,
  );

  // GPS drift while standing still — treat small movement as stopped.
  if (km < 0.03) return 0;

  const kmh = (km / seconds) * 3600;
  if (kmh > 80) return null;

  return normalizeSpeedKmh(kmh);
}

export function formatSpeed(
  speedKmh: number | null | undefined,
  options?: { hasLocation?: boolean },
) {
  if (speedKmh == null) {
    return options?.hasLocation ? "Stopped" : null;
  }
  if (speedKmh < STOPPED_SPEED_KMH) return "Stopped";
  return `${Math.round(speedKmh)} km/h`;
}

export function normalizeRideName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function duplicateRideNameMessage(name: string) {
  return `"${name}" is already on this ride. Choose a unique name — try adding an initial, like ${name} B.`;
}

export const RIDE_REPORT_OPTIONS: Array<{
  type: RideReportType;
  label: string;
  description: string;
}> = [
  { type: "accident", label: "Accident / fall", description: "Someone is hurt or has come off the bike." },
  { type: "mechanical", label: "Mechanical", description: "Puncture, chain, brakes, or another bike issue." },
  { type: "lost", label: "Lost / separated", description: "Rider is separated from the group or unsure of the route." },
  { type: "other", label: "Other", description: "Anything else the group should know about." },
];

export function formatReportType(type: RideReportType) {
  return RIDE_REPORT_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

export function formatReportTime(createdAt: string) {
  return formatLastSeen(createdAt).replace("No location yet", "Just now");
}

const DEFAULT_RIDE_SPEED_KMH = 20;

export type EtaToYouResult =
  | { kind: "here" }
  | { kind: "stopped" }
  | { kind: "eta"; minutes: number; speedKmh: number; usingDefaultSpeed: boolean };

export function estimateEtaToYou(
  distanceKm: number,
  riderSpeedKmh: number | null | undefined,
): EtaToYouResult {
  if (distanceKm < 0.05) {
    return { kind: "here" };
  }

  const isMoving = riderSpeedKmh != null && riderSpeedKmh >= STOPPED_SPEED_KMH;
  const speedKmh = isMoving ? riderSpeedKmh : DEFAULT_RIDE_SPEED_KMH;
  const minutes = Math.max(1, Math.round((distanceKm / speedKmh) * 60));

  if (!isMoving) {
    return { kind: "stopped" };
  }

  return {
    kind: "eta",
    minutes,
    speedKmh,
    usingDefaultSpeed: false,
  };
}

export function formatEtaToYou(result: EtaToYouResult, distanceKm?: number) {
  if (result.kind === "here") {
    return "With you now";
  }

  if (result.kind === "stopped") {
    if (distanceKm != null && distanceKm >= 0.05) {
      const minutes = Math.max(1, Math.round((distanceKm / DEFAULT_RIDE_SPEED_KMH) * 60));
      return `Stopped now · roughly ${formatEtaDuration(minutes)} if they ride at ${DEFAULT_RIDE_SPEED_KMH} km/h`;
    }
    return "Stopped — not moving toward you";
  }

  const pace = result.usingDefaultSpeed
    ? `estimated at ${result.speedKmh} km/h`
    : `at ${Math.round(result.speedKmh)} km/h`;
  return `About ${formatEtaDuration(result.minutes)} to you (${pace})`;
}

function formatEtaDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
