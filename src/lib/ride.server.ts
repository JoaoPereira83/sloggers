import { createServerFn } from "@tanstack/react-start";

import { requireApprovedMember } from "./member.server";
import type { RideSession } from "./ride-session";
import { rideSessionConfig } from "./ride-session";
import type { RideReportType, RideSnapshot } from "./ride-types";
import { normalizeRideName } from "./ride-utils";

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
  await requireApprovedMember();

  const { getRideStore } = await import("./ride-store");
  const store = await getRideStore();
  let currentRiderId = await getCurrentRiderId();

  if (currentRiderId) {
    const rideActive = store.ride?.status === "active";
    const stillOnRide = store.riders.some((rider) => rider.id === currentRiderId);
    if (!rideActive || !stillOnRide) {
      await setCurrentRiderId(undefined);
      currentRiderId = null;
    }
  }

  return {
    ride: store.ride,
    riders: store.riders,
    reports: store.reports ?? [],
    currentRiderId,
  };
});

export const joinRide = createServerFn({ method: "POST" })
  .validator((data: { name?: string }) => data)
  .handler(async ({ data }) => {
    const member = await requireApprovedMember();
    const { joinRideStore } = await import("./ride-store");
    const name = normalizeRideName(data.name?.trim() || member.displayName);
    if (!name) throw new Error("Please enter your name.");

    const currentRiderId = await getCurrentRiderId();
    const rider = await joinRideStore(name, currentRiderId);
    await setCurrentRiderId(rider.id);
    return { riderId: rider.id, name: rider.name };
  });

export const leaveRide = createServerFn({ method: "POST" }).handler(async () => {
  await requireApprovedMember();

  const { leaveRideStore } = await import("./ride-store");
  const riderId = await getCurrentRiderId();
  if (!riderId) return { ok: true as const };

  await leaveRideStore(riderId);
  await setCurrentRiderId(undefined);
  return { ok: true as const };
});

export const updateRideLocation = createServerFn({ method: "POST" })
  .validator((data: { latitude: number; longitude: number; speedKmh?: number | null }) => data)
  .handler(async ({ data }) => {
    await requireApprovedMember();

    const { updateRideLocationStore } = await import("./ride-store");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride before sharing your location.");

    await updateRideLocationStore(riderId, data.latitude, data.longitude, data.speedKmh);
    return { ok: true as const };
  });

export const setRideSharing = createServerFn({ method: "POST" })
  .validator((data: { isSharing: boolean }) => data)
  .handler(async ({ data }) => {
    await requireApprovedMember();

    const { setRideSharingStore } = await import("./ride-store");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride first.");

    await setRideSharingStore(riderId, data.isSharing);
    return { ok: true as const };
  });

export const startRide = createServerFn({ method: "POST" })
  .validator((data: { password: string; title?: string; meetingLabel?: string }) => data)
  .handler(async ({ data }) => {
    if (data.password !== getRideAdminPassword()) {
      throw new Error("Incorrect ride admin password.");
    }

    const { startRideStore } = await import("./ride-store");
    return startRideStore({
      title: data.title?.trim() || "Live tracking",
      meetingLabel: data.meetingLabel?.trim() || "Southam",
    });
  });

export const endRide = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (data.password !== getRideAdminPassword()) {
      throw new Error("Incorrect ride admin password.");
    }

    const { endRideStore } = await import("./ride-store");
    await endRideStore();
    await setCurrentRiderId(undefined);
    return { ok: true as const };
  });

export const submitRideReport = createServerFn({ method: "POST" })
  .validator(
    (data: {
      type: RideReportType;
      message?: string;
      latitude?: number;
      longitude?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireApprovedMember();

    const { submitRideReportStore } = await import("./ride-store");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride before sending a report.");

    return submitRideReportStore({
      riderId,
      type: data.type,
      message: data.message,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  });

export const updateRideReport = createServerFn({ method: "POST" })
  .validator(
    (data: {
      reportId: string;
      type: RideReportType;
      message?: string;
      latitude?: number;
      longitude?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireApprovedMember();

    const { updateRideReportStore } = await import("./ride-store");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride before updating a report.");

    return updateRideReportStore({
      reportId: data.reportId,
      riderId,
      type: data.type,
      message: data.message,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  });

export const deleteRideReport = createServerFn({ method: "POST" })
  .validator((data: { reportId: string }) => data)
  .handler(async ({ data }) => {
    await requireApprovedMember();

    const { deleteRideReportStore } = await import("./ride-store");
    const riderId = await getCurrentRiderId();
    if (!riderId) throw new Error("Join the ride before deleting a report.");

    await deleteRideReportStore(data.reportId, riderId);
    return { ok: true as const };
  });

export const getRiderStreetLocation = createServerFn({ method: "POST" })
  .validator((data: { latitude: number; longitude: number }) => data)
  .handler(async ({ data }) => {
    await requireApprovedMember();

    const { reverseGeocodeLocation } = await import("./reverse-geocode");
    const label = await reverseGeocodeLocation(data.latitude, data.longitude);
    return { label };
  });
