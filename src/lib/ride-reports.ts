import type { RideReport, RideStore } from "./ride-types";

export function assertCanManageOwnReport(
  store: RideStore,
  riderId: string,
  reportId: string,
): { rider: NonNullable<RideStore["riders"][number]>; report: RideReport } {
  if (!store.ride || store.ride.status !== "active") {
    throw new Error("There is no active ride right now.");
  }

  const rider = store.riders.find((entry) => entry.id === riderId);
  if (!rider) throw new Error("Join the ride first.");

  if (!rider.isSharing) {
    throw new Error("Turn location sharing back on to manage your reports.");
  }

  const report = (store.reports ?? []).find((entry) => entry.id === reportId);
  if (!report) throw new Error("That report could not be found.");

  if (report.riderId !== riderId) {
    throw new Error("You can only update or delete your own reports.");
  }

  return { rider, report };
}

export function assertCanSubmitReport(store: RideStore, riderId: string) {
  if (!store.ride || store.ride.status !== "active") {
    throw new Error("There is no active ride to report on right now.");
  }

  const rider = store.riders.find((entry) => entry.id === riderId);
  if (!rider) throw new Error("Join the ride before sending a report.");

  if (!rider.isSharing) {
    throw new Error("Turn on location sharing before sending a report.");
  }

  return rider;
}
