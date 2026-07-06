import { duplicateRideNameMessage } from "./ride-utils";
import type { RideRider } from "./ride-types";

export function findRideRiderByName(riders: RideRider[], name: string) {
  const normalized = name.toLowerCase();
  return riders.find((rider) => rider.name.toLowerCase() === normalized) ?? null;
}

export function assertUniqueRideName(
  riders: RideRider[],
  name: string,
  currentRiderId?: string | null,
) {
  const existing = findRideRiderByName(riders, name);
  if (!existing) return;

  if (currentRiderId && existing.id === currentRiderId) return;

  throw new Error(duplicateRideNameMessage(name));
}
