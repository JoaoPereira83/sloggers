type NominatimAddress = {
  road?: string;
  house_number?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  cycleway?: string;
  village?: string;
  town?: string;
  city?: string;
  hamlet?: string;
  suburb?: string;
  county?: string;
};

type CacheEntry = {
  label: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
let lastRequestAt = 0;

export function locationCacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function formatStreetLocation(address: NominatimAddress) {
  const streetName =
    address.road ??
    address.pedestrian ??
    address.footway ??
    address.cycleway ??
    address.path;

  const parts: string[] = [];

  if (streetName) {
    parts.push(
      address.house_number ? `${address.house_number} ${streetName}` : streetName,
    );
  }

  const locality =
    address.village ?? address.hamlet ?? address.suburb ?? address.town ?? address.city;

  if (locality && !parts.some((part) => part.includes(locality))) {
    parts.push(locality);
  }

  if (parts.length === 0 && address.county) {
    parts.push(address.county);
  }

  return parts.join(", ");
}

async function waitForRateLimit() {
  const now = Date.now();
  const waitMs = Math.max(0, 1000 - (now - lastRequestAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
}

export async function reverseGeocodeLocation(latitude: number, longitude: number) {
  const cacheKey = locationCacheKey(latitude, longitude);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.label;
  }

  await waitForRateLimit();

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "SouthamSloggers/1.0 (https://sloggers.vercel.app/ride; contact: joao.jose83@gmail.com)",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    address?: NominatimAddress;
    display_name?: string;
  };

  const label =
    formatStreetLocation(data.address ?? {}) ||
    data.display_name?.split(",").slice(0, 2).join(",").trim() ||
    null;

  if (label) {
    cache.set(cacheKey, { label, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return label;
}
