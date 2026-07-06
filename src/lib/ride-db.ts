import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { computeSpeedKmh } from "./ride-utils";
import type { ActiveRide, RideRider, RideStore } from "./ride-types";

type RideRow = {
  id: string;
  title: string;
  status: "active" | "ended";
  meeting_label: string;
  started_at: string;
};

type RiderRow = {
  id: string;
  ride_id: string;
  name: string;
  joined_at: string;
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
  speed_kmh: number | null;
  is_sharing: boolean;
};

function mapRide(row: RideRow): ActiveRide {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    meetingLabel: row.meeting_label,
    startedAt: row.started_at,
  };
}

function mapRider(row: RiderRow): RideRider {
  return {
    id: row.id,
    name: row.name,
    joinedAt: row.joined_at,
    latitude: row.latitude,
    longitude: row.longitude,
    updatedAt: row.updated_at,
    speedKmh: row.speed_kmh ?? null,
    isSharing: row.is_sharing,
  };
}

const supabaseUrlHint =
  "SUPABASE_URL is wrong in Vercel. Use your Project URL from Supabase → Settings → General (looks like https://xxxxx.supabase.co), not the supabase.com dashboard link.";

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return { url, key };
}

function assertValidSupabaseUrl(url: string) {
  if (
    url.includes("supabase.com/dashboard") ||
    url.includes("supabase.com/project") ||
    url.startsWith("https://supabase.com")
  ) {
    throw new Error(supabaseUrlHint);
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    throw new Error(supabaseUrlHint);
  }
}

export function toSupabaseErrorMessage(message: string) {
  if (
    message.includes("<!DOCTYPE") ||
    message.includes("Supabase Studio") ||
    message.includes("Looking for something")
  ) {
    return supabaseUrlHint;
  }

  if (message.includes("row-level security policy")) {
    return "Database permissions blocked the ride. In Supabase SQL Editor run: alter table public.rides disable row level security; alter table public.ride_riders disable row level security; Also make sure Vercel uses your Secret key (sb_secret_...), not the publishable key.";
  }

  return message;
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

export function isProductionServer() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function assertValidSupabaseKey(key: string) {
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be your Secret key (sb_secret_...), not the publishable key. In Supabase → Settings → API Keys, copy the Secret key into Vercel.",
    );
  }
}

function getSupabaseAdmin(): SupabaseClient {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured on the server. In Vercel, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY under Settings → Environment Variables, then redeploy.",
    );
  }

  assertValidSupabaseUrl(url);
  assertValidSupabaseKey(key);

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function readRideStoreFromSupabase(): Promise<RideStore> {
  const supabase = getSupabaseAdmin();

  const { data: rideRows, error: rideError } = await supabase
    .from("rides")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);

  if (rideError) throw new Error(toSupabaseErrorMessage(rideError.message));

  const activeRide = rideRows?.[0] as RideRow | undefined;
  if (!activeRide) {
    return { ride: null, riders: [] };
  }

  const { data: riderRows, error: riderError } = await supabase
    .from("ride_riders")
    .select("*")
    .eq("ride_id", activeRide.id)
    .order("joined_at", { ascending: true });

  if (riderError) throw new Error(toSupabaseErrorMessage(riderError.message));

  return {
    ride: mapRide(activeRide),
    riders: ((riderRows ?? []) as RiderRow[]).map(mapRider),
  };
}

export async function startRideInSupabase(input: {
  title: string;
  meetingLabel: string;
}): Promise<ActiveRide> {
  const supabase = getSupabaseAdmin();

  await supabase.from("rides").update({ status: "ended" }).eq("status", "active");

  const { data, error } = await supabase
    .from("rides")
    .insert({
      title: input.title,
      status: "active",
      meeting_label: input.meetingLabel,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(toSupabaseErrorMessage(error?.message ?? "Could not start ride."));
  }

  return mapRide(data as RideRow);
}

export async function endRideInSupabase() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("rides").update({ status: "ended" }).eq("status", "active");
  if (error) throw new Error(toSupabaseErrorMessage(error.message));
}

export async function joinRideInSupabase(name: string): Promise<RideRider> {
  const supabase = getSupabaseAdmin();
  const store = await readRideStoreFromSupabase();

  if (!store.ride || store.ride.status !== "active") {
    throw new Error("There is no active ride to join right now.");
  }

  const existing = store.riders.find(
    (rider) => rider.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) {
    const { data, error } = await supabase
      .from("ride_riders")
      .update({ is_sharing: true })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(toSupabaseErrorMessage(error?.message ?? "Could not rejoin ride."));
    }
    return mapRider(data as RiderRow);
  }

  const { data, error } = await supabase
    .from("ride_riders")
    .insert({
      ride_id: store.ride.id,
      name,
      is_sharing: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(toSupabaseErrorMessage(error?.message ?? "Could not join ride."));
  }

  return mapRider(data as RiderRow);
}

export async function leaveRideInSupabase(riderId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ride_riders").delete().eq("id", riderId);
  if (error) throw new Error(toSupabaseErrorMessage(error.message));
}

export async function updateRideLocationInSupabase(
  riderId: string,
  latitude: number,
  longitude: number,
  gpsSpeedKmh?: number | null,
) {
  const supabase = getSupabaseAdmin();
  const store = await readRideStoreFromSupabase();

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

  const { error } = await supabase
    .from("ride_riders")
    .update({
      latitude,
      longitude,
      updated_at: updatedAt,
      speed_kmh: speedKmh,
      is_sharing: true,
    })
    .eq("id", riderId);

  if (error) throw new Error(toSupabaseErrorMessage(error.message));
}

export async function setRideSharingInSupabase(riderId: string, isSharing: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ride_riders").update({ is_sharing: isSharing }).eq("id", riderId);
  if (error) throw new Error(toSupabaseErrorMessage(error.message));
}
