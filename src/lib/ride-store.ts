import { shouldAutoEndRide } from "./ride-expiry";
import type { RideStore } from "./ride-types";

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

async function readStoreRaw(): Promise<RideStore> {
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

async function expireActiveRideOnce(): Promise<boolean> {
  const store = await readStoreRaw();
  const ride = store.ride;

  if (!ride || ride.status !== "active") {
    return false;
  }

  if (!shouldAutoEndRide(ride.startedAt)) {
    return false;
  }

  await endRideStore();
  return true;
}

/** End forgotten rides at 23:59 UK time; run twice to clear any stragglers. */
export async function expireActiveRideIfDue(): Promise<boolean> {
  let ended = false;

  for (let pass = 0; pass < 2; pass += 1) {
    if (await expireActiveRideOnce()) {
      ended = true;
    }
  }

  return ended;
}

async function readStore(): Promise<RideStore> {
  await expireActiveRideIfDue();
  return readStoreRaw();
}

export async function getRideStore(): Promise<RideStore> {
  return readStore();
}

export async function ensureActiveRideStore(): Promise<import("./ride-types").ActiveRide> {
  const store = await readStore();
  if (store.ride?.status === "active") {
    return store.ride;
  }

  return startRideStore({
    title: "Live tracking",
    meetingLabel: "Southam",
  });
}

export async function startRideStore(input: {
  title: string;
  meetingLabel: string;
}): Promise<import("./ride-types").ActiveRide> {
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
  store.reports = [];
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
  store.reports = [];
  await writeStore(store);
}

export async function joinRideStore(
  name: string,
  currentRiderId?: string | null,
): Promise<import("./ride-types").RideRider> {
  const { isSupabaseConfigured, joinRideInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    return joinRideInSupabase(name, currentRiderId);
  }

  await ensureActiveRideStore();

  const { randomUUID } = await import("node:crypto");
  const store = await readStore();

  const { assertUniqueRideName, findRideRiderByName } = await import("./ride-names");
  assertUniqueRideName(store.riders, name, currentRiderId);

  const existing = findRideRiderByName(store.riders, name);
  if (existing && existing.id === currentRiderId) {
    await writeStore(store);
    return existing;
  }

  const rider: import("./ride-types").RideRider = {
    id: randomUUID(),
    name,
    joinedAt: new Date().toISOString(),
    latitude: null,
    longitude: null,
    updatedAt: null,
    speedKmh: null,
    isSharing: false,
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

  const { computeSpeedKmh } = await import("./ride-utils");
  const updatedAt = new Date().toISOString();
  const nextSpeed = computeSpeedKmh({
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
  const speedKmh = nextSpeed ?? rider.speedKmh ?? 0;

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

export async function submitRideReportStore(input: {
  riderId: string;
  type: import("./ride-types").RideReportType;
  message?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<import("./ride-types").RideReport> {
  const { isSupabaseConfigured, submitRideReportInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    return submitRideReportInSupabase(input);
  }

  const { randomUUID } = await import("node:crypto");
  const { assertCanSubmitReport } = await import("./ride-reports");
  const store = await readStore();
  const rider = assertCanSubmitReport(store, input.riderId);

  const report: import("./ride-types").RideReport = {
    id: randomUUID(),
    rideId: store.ride!.id,
    riderId: rider.id,
    riderName: rider.name,
    type: input.type,
    message: input.message?.trim() || null,
    latitude: input.latitude ?? rider.latitude,
    longitude: input.longitude ?? rider.longitude,
    createdAt: new Date().toISOString(),
  };

  store.reports = [report, ...(store.reports ?? [])];
  await writeStore(store);
  return report;
}

export async function updateRideReportStore(input: {
  reportId: string;
  riderId: string;
  type: import("./ride-types").RideReportType;
  message?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<import("./ride-types").RideReport> {
  const { isSupabaseConfigured, updateRideReportInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    return updateRideReportInSupabase(input);
  }

  const { assertCanManageOwnReport } = await import("./ride-reports");
  const store = await readStore();
  const { rider, report } = assertCanManageOwnReport(store, input.riderId, input.reportId);

  report.type = input.type;
  report.message = input.message?.trim() || null;
  report.latitude = input.latitude ?? rider.latitude;
  report.longitude = input.longitude ?? rider.longitude;
  report.riderName = rider.name;

  await writeStore(store);
  return report;
}

export async function deleteRideReportStore(reportId: string, riderId: string) {
  const { isSupabaseConfigured, deleteRideReportInSupabase } = await useSupabaseStore();
  if (isSupabaseConfigured()) {
    await deleteRideReportInSupabase(reportId, riderId);
    return;
  }

  const { assertCanManageOwnReport } = await import("./ride-reports");
  const store = await readStore();
  assertCanManageOwnReport(store, riderId, reportId);
  store.reports = (store.reports ?? []).filter((report) => report.id !== reportId);
  await writeStore(store);
}
