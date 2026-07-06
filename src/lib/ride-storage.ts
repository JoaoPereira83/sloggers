import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { RideStore } from "./ride-types";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rideDataPath = join(projectRoot, "data/ride-live.json");

const emptyStore = (): RideStore => ({ ride: null, riders: [] });

export async function readRideStore(): Promise<RideStore> {
  try {
    const raw = await readFile(rideDataPath, "utf-8");
    return JSON.parse(raw) as RideStore;
  } catch {
    return emptyStore();
  }
}

export async function writeRideStore(data: RideStore) {
  await mkdir(dirname(rideDataPath), { recursive: true });
  await writeFile(rideDataPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}
