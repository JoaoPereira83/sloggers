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

export function computeSpeedKmh(input: {
  previous: { latitude: number; longitude: number; updatedAt: string } | null;
  latitude: number;
  longitude: number;
  updatedAt: string;
  gpsSpeedKmh?: number | null;
}) {
  const { previous, latitude, longitude, updatedAt, gpsSpeedKmh } = input;

  if (gpsSpeedKmh != null && gpsSpeedKmh >= 0 && gpsSpeedKmh <= 80) {
    return Math.round(gpsSpeedKmh * 10) / 10;
  }

  if (!previous) return null;

  const seconds =
    (new Date(updatedAt).getTime() - new Date(previous.updatedAt).getTime()) / 1000;
  if (seconds < 5) return null;

  const km = haversineKm(
    previous.latitude,
    previous.longitude,
    latitude,
    longitude,
  );
  const kmh = (km / seconds) * 3600;

  if (kmh < 0.5) return 0;
  if (kmh > 80) return null;

  return Math.round(kmh * 10) / 10;
}

export function formatSpeed(speedKmh: number | null | undefined) {
  if (speedKmh == null) return null;
  if (speedKmh < 0.5) return "Stopped";
  return `${Math.round(speedKmh)} km/h`;
}
