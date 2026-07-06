import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";

import type { RideSession } from "./ride-session";
import { rideSessionConfig } from "./ride-session";
import type { RideSnapshot } from "./ride-types";

function getRideAdminPassword() {
  return process.env.RIDE_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "sloggers";
}

async function getCurrentRiderId() {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<RideSession>(rideSessionConfig);
  return session.data.riderId ?? null;
}

async function setCurrentRiderId(riderId: string | undefined) {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<RideSession>(rideSessionConfig);
  if (riderId) {
    await session.update({ riderId });
  } else {
    await session.clear();
  }
}

export const getRideSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<RideSnapshot> => {
  const { readRideStore } = await import("./ride-storage");
  const store = await readRideStore();
  const currentRiderId = await getCurrentRiderId();

  return {
    ride: store.ride,
    riders: store.riders,
    currentRiderId,
  };
});

export const joinRide = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const { readRideStore, writeRideStore } = await import("./ride-storage");
    const store = await readRideStore();

    if (!store.ride || store.ride.status !== "active") {
      throw new Error("There is no active ride to join right now.");
    }

    const name = data.name.trim();
    if (!name) throw new Error("Please enter your name.");

    const existing = store.riders.find(
      (rider) => rider.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      await setCurrentRiderId(existing.id);
      existing.isSharing = true;
      await writeRideStore(store);
      return { riderId: existing.id, name: existing.name };
    }

    const rider = {
      id: randomUUID(),
      name,
      joinedAt: new Date().toISOString(),
      latitude: null,
      longitude: null,
      updatedAt: null,
      isSharing: true,
    };

    store.riders.push(rider);
    await writeRideStore(store);
    await setCurrentRiderId(rider.id);

    return { riderId: rider.id, name: rider.name };
  });

export const leaveRide = createServerFn({ method: "POST" }).handler(async () => {
  const { readRideStore, writeRideStore } = await import("./ride-storage");
  const riderId = await getCurrentRiderId();
  if (!riderId) return { ok: true as const };

  const store = await readRideStore();
  store.riders = store.riders.filter((rider) => rider.id !== riderId);
  await writeRideStore(store);
  await setCurrentRiderId(undefined);

  return { ok: true as const };
});

export const updateRideLocation = createServerFn({ method: "POST" })
  .validator((data: { latitude: number; longitude: number }) => data)
  .handler(async ({ data }) => {
    const { readRideStore, writeRideStore } = await import("./ride-storage");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride before sharing your location.");

    const store = await readRideStore();
    if (!store.ride || store.ride.status !== "active") {
      throw new Error("This ride is not active.");
    }

    const rider = store.riders.find((entry) => entry.id === riderId);
    if (!rider) throw new Error("You are not on this ride.");

    rider.latitude = data.latitude;
    rider.longitude = data.longitude;
    rider.updatedAt = new Date().toISOString();
    rider.isSharing = true;

    await writeRideStore(store);
    return { ok: true as const };
  });

export const setRideSharing = createServerFn({ method: "POST" })
  .validator((data: { isSharing: boolean }) => data)
  .handler(async ({ data }) => {
    const { readRideStore, writeRideStore } = await import("./ride-storage");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride first.");

    const store = await readRideStore();
    const rider = store.riders.find((entry) => entry.id === riderId);
    if (!rider) throw new Error("You are not on this ride.");

    rider.isSharing = data.isSharing;
    await writeRideStore(store);
    return { ok: true as const };
  });

export const startRide = createServerFn({ method: "POST" })
  .validator((data: { password: string; title?: string; meetingLabel?: string }) => data)
  .handler(async ({ data }) => {
    if (data.password !== getRideAdminPassword()) {
      throw new Error("Incorrect ride admin password.");
    }

    const { readRideStore, writeRideStore } = await import("./ride-storage");
    const store = await readRideStore();

    store.ride = {
      id: randomUUID(),
      title: data.title?.trim() || "Sunday ride",
      status: "active",
      startedAt: new Date().toISOString(),
      meetingLabel: data.meetingLabel?.trim() || "Southam",
    };
    store.riders = [];

    await writeRideStore(store);
    return store.ride;
  });

export const endRide = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (data.password !== getRideAdminPassword()) {
      throw new Error("Incorrect ride admin password.");
    }

    const { readRideStore, writeRideStore } = await import("./ride-storage");
    const store = await readRideStore();
    store.ride = null;
    store.riders = [];
    await writeRideStore(store);
    await setCurrentRiderId(undefined);

    return { ok: true as const };
  });
