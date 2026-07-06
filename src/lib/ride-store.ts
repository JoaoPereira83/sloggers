import type { ActiveRide, RideRider, RideStore } from "./ride-types";
import { computeSpeedKmh } from "./ride-utils";

const missingSupabaseMessage =
  "Live ride map needs Supabase on Vercel. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy.";

async function useFileStore() {
  return import("./ride-storage");
}

async function useSupabaseStore() {
  return import("./ride-db");
}

async function ensureStorageBackend() {
  const { isSupabaseConfigured, isProductionServer } = await useSupabaseStore();
  if (!isSupabaseConfigured() && isProductionServer()) {
    throw new Error(missingSupabaseMessage);
  }
}

async function readStore(): Promise<RideStore> {
  await ensureStorageBackend();
  const { isSupabaseConfigured, readRideStoreFromSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    return readRideStoreFromSupabase();
  }
  const { readRideStore } = await useFileStore();
  return readRideStore();
}

async function writeStore(data: RideStore) {
  const { writeRideStore } = await useFileStore();
  await writeRideStore(data);
}

export async function getRideStore(): Promise<RideStore> {
  return readStore();
}

export async function startRideStore(input: {
  title: string;
  meetingLabel: string;
}): Promise<ActiveRide> {
  await ensureStorageBackend();
  const { isSupabaseConfigured, startRideInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    return startRideInSupabase(input);
  }

  const { randomUUID } = await import("node:crypto");
  const { readRideStore } = await useFileStore();
  const store = await readRideStore();

  store.ride = {
    id: randomUUID(),
    title: input.title,
    status: "active",
    startedAt: new Date().toISOString(),
    meetingLabel: input.meetingLabel,
  };
  store.riders = [];
  await writeStore(store);
  return store.ride;
}

export async function endRideStore() {
  const { isSupabaseConfigured, endRideInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    await endRideInSupabase();
    return;
  }

  const { readRideStore } = await useFileStore();
  const store = await readRideStore();
  store.ride = null;
  store.riders = [];
  await writeStore(store);
}

export async function joinRideStore(name: string): Promise<RideRider> {
  const { isSupabaseConfigured, joinRideInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    return joinRideInSupabase(name);
  }

  const { randomUUID } = await import("node:crypto");
  const store = await readStore();

  if (!store.ride || store.ride.status !== "active") {
    throw new Error("There is no active ride to join right now.");
  }

  const existing = store.riders.find(
    (rider) => rider.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    existing.isSharing = true;
    await writeStore(store);
    return existing;
  }

  const rider: RideRider = {
    id: randomUUID(),
    name,
    joinedAt: new Date().toISOString(),
    latitude: null,
    longitude: null,
    updatedAt: null,
    speedKmh: null,
    isSharing: true,
  };

  store.riders.push(rider);
  await writeStore(store);
  return rider;
}

export async function leaveRideStore(riderId: string) {
  const { isSupabaseConfigured, leaveRideInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    await leaveRideInSupabase(riderId);
    return;
  }

  const store = await readStore();
  store.riders = store.riders.filter((rider) => rider.id !== riderId);
  await writeStore(store);
}

export async function updateRideLocationStore(
  riderId: string,
  latitude: number,
  longitude: number,
  gpsSpeedKmh?: number | null,
) {
  const { isSupabaseConfigured, updateRideLocationInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    await updateRideLocationInSupabase(riderId, latitude, longitude, gpsSpeedKmh);
    return;
  }

  const store = await readStore();
  if (!store.ride || store.ride.status !== "active") {
    throw new Error("This ride is not active.");
  }

  const rider = store.riders.find((entry) => entry.id === riderId);
  if (!rider) throw new Error("You are not on this ride.");

  const updatedAt = new Date().toISOString();
  const speedKmh = computeSpeedKmh({
    previous:
      rider.latitude != null && rider.longitude != null && rider.updatedAt
        ? {
            latitude: rider.latitude,
            longitude: rider.longitude,
            updatedAt: rider.updatedAt,
          }
        : null,
    latitude,
    longitude,
    updatedAt,
    gpsSpeedKmh,
  });

  rider.latitude = latitude;
  rider.longitude = longitude;
  rider.updatedAt = updatedAt;
  rider.speedKmh = speedKmh;
  rider.isSharing = true;
  await writeStore(store);
}

export async function setRideSharingStore(riderId: string, isSharing: boolean) {
  const { isSupabaseConfigured, setRideSharingInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    await setRideSharingInSupabase(riderId, isSharing);
    return;
  }

  const store = await readStore();
  const rider = store.riders.find((entry) => entry.id === riderId);
  if (!rider) throw new Error("You are not on this ride.");

  rider.isSharing = isSharing;
  await writeStore(store);
}
