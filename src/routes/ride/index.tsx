import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Navigation, Radio, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RideMap } from "@/components/RideMap";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import {
  endRide,
  getRideSnapshot,
  joinRide,
  leaveRide,
  setRideSharing,
  startRide,
  updateRideLocation,
} from "@/lib/ride.server";
import { formatDistance, formatLastSeen, formatSpeed, haversineKm } from "@/lib/ride-utils";
import type { RideRider } from "@/lib/ride-types";

export const Route = createFileRoute("/ride/")({
  head: () => ({
    meta: [
      { title: "Ride tracker — Southam Sloggers" },
      {
        name: "description",
        content:
          "Live ride-day map for Southam Sloggers. Join the Sunday ride and see where everyone is.",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Sloggers" },
      { name: "theme-color", content: "#5c2d82" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: RidePage,
});

function RidePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  const rideQuery = useQuery({
    queryKey: ["ride-snapshot"],
    queryFn: () => getRideSnapshot(),
    refetchInterval: 10_000,
  });

  const snapshot = rideQuery.data;
  const currentRider =
    snapshot?.riders.find((rider) => rider.id === snapshot.currentRiderId) ?? null;
  const selectedRider =
    snapshot?.riders.find((rider) => rider.id === selectedRiderId) ?? null;
  const isJoined = Boolean(snapshot?.currentRiderId);
  const isActive = snapshot?.ride?.status === "active";
  const isSharing = currentRider?.isSharing ?? false;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ride-snapshot"] });

  const joinMutation = useMutation({
    mutationFn: (riderName: string) => joinRide({ data: { name: riderName } }),
    onSuccess: () => invalidate(),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveRide(),
    onSuccess: () => {
      setSelectedRiderId(null);
      invalidate();
    },
  });

  const sharingMutation = useMutation({
    mutationFn: (nextSharing: boolean) => setRideSharing({ data: { isSharing: nextSharing } }),
    onSuccess: () => invalidate(),
  });

  const startMutation = useMutation({
    mutationFn: () =>
      startRide({
        data: {
          password: adminPassword,
          title: "Sunday ride",
          meetingLabel: "Southam",
        },
      }),
    onSuccess: () => invalidate(),
  });

  const endMutation = useMutation({
    mutationFn: () => endRide({ data: { password: adminPassword } }),
    onSuccess: () => {
      setSelectedRiderId(null);
      invalidate();
    },
  });

  const pushLocation = useCallback(
    async (latitude: number, longitude: number, speedMs?: number | null) => {
      try {
        const speedKmh =
          speedMs != null && speedMs >= 0 ? Math.round(speedMs * 3.6 * 10) / 10 : undefined;
        await updateRideLocation({ data: { latitude, longitude, speedKmh } });
        setLocationError(null);
      } catch (error) {
        setLocationError(error instanceof Error ? error.message : "Could not update location.");
      }
    },
    [],
  );

  useEffect(() => {
    if (!isJoined || !isActive || !isSharing || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void pushLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.speed,
        );
      },
      (error) => {
        setLocationError(error.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );

    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void pushLocation(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.speed,
          );
        },
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
      );
    }, 30_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(intervalId);
    };
  }, [isJoined, isActive, isSharing, pushLocation]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Ride day
          </div>
          <h1 className="mt-3 display text-5xl leading-none md:text-7xl">Live ride map</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Join this Sunday&apos;s ride to share your location with other Sloggers. Perfect when
            the group splits and you&apos;re waiting at the cafe.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add this page to your phone&apos;s home screen for quick access — no app store needed.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <StatusBanner rideTitle={snapshot?.ride?.title} isActive={isActive} riderCount={snapshot?.riders.length ?? 0} />

          {!isActive ? (
            <EmptyRideState
              showAdmin={showAdmin}
              onToggleAdmin={() => setShowAdmin((value) => !value)}
              adminPassword={adminPassword}
              onAdminPasswordChange={setAdminPassword}
              onStart={() => startMutation.mutate()}
              isStarting={startMutation.isPending}
              startError={startMutation.error instanceof Error ? startMutation.error.message : null}
            />
          ) : !isJoined ? (
            <JoinCard
              name={name}
              onNameChange={setName}
              onJoin={() => joinMutation.mutate(name)}
              isJoining={joinMutation.isPending}
              error={joinMutation.error instanceof Error ? joinMutation.error.message : null}
            />
          ) : (
            <>
              <SharingControls
                isSharing={isSharing}
                locationError={locationError}
                onToggleSharing={(next) => sharingMutation.mutate(next)}
                onLeave={() => leaveMutation.mutate()}
                isUpdating={sharingMutation.isPending || leaveMutation.isPending}
              />

              <RideMap
                riders={snapshot?.riders ?? []}
                selectedRiderId={selectedRiderId}
                currentRiderId={snapshot?.currentRiderId ?? null}
                onSelectRider={setSelectedRiderId}
              />

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <RiderList
                  riders={snapshot?.riders ?? []}
                  currentRiderId={snapshot?.currentRiderId ?? null}
                  selectedRiderId={selectedRiderId}
                  onSelectRider={setSelectedRiderId}
                />
                <RiderDetail
                  rider={selectedRider}
                  currentRider={currentRider}
                  onClear={() => setSelectedRiderId(null)}
                />
              </div>
            </>
          )}

          {isActive ? (
            <AdminPanel
              showAdmin={showAdmin}
              onToggleAdmin={() => setShowAdmin((value) => !value)}
              adminPassword={adminPassword}
              onAdminPasswordChange={setAdminPassword}
              onEnd={() => endMutation.mutate()}
              isEnding={endMutation.isPending}
              endError={endMutation.error instanceof Error ? endMutation.error.message : null}
            />
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBanner({
  rideTitle,
  isActive,
  riderCount,
}: {
  rideTitle?: string;
  isActive?: boolean;
  riderCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-card px-6 py-4 shadow-soft">
      <div className="inline-flex items-center gap-2 text-sm font-medium">
        <Radio className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        {isActive ? `${rideTitle ?? "Sunday ride"} is live` : "No active ride right now"}
      </div>
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {riderCount} rider{riderCount === 1 ? "" : "s"} sharing
      </div>
    </div>
  );
}

function JoinCard({
  name,
  onNameChange,
  onJoin,
  isJoining,
  error,
}: {
  name: string;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  isJoining: boolean;
  error: string | null;
}) {
  return (
    <form
      className="max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        onJoin();
      }}
    >
      <h2 className="display text-3xl">Join this Sunday&apos;s ride</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your location will only be visible to other riders who joined this ride.
      </p>
      <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">
        Your name
      </label>
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="How the group knows you"
        required
        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
      />
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={isJoining}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground"
      >
        {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        I&apos;m in today
      </button>
    </form>
  );
}

function SharingControls({
  isSharing,
  locationError,
  onToggleSharing,
  onLeave,
  isUpdating,
}: {
  isSharing: boolean;
  locationError: string | null;
  onToggleSharing: (value: boolean) => void;
  onLeave: () => void;
  isUpdating: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => onToggleSharing(!isSharing)}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wider ${
          isSharing
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground"
        }`}
      >
        <Navigation className="h-4 w-4" />
        {isSharing ? "Sharing location" : "Share my location"}
      </button>
      <button
        type="button"
        disabled={isUpdating}
        onClick={onLeave}
        className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground"
      >
        Leave ride
      </button>
      {locationError ? <p className="w-full text-sm text-destructive">{locationError}</p> : null}
      {isSharing ? (
        <p className="w-full text-sm text-muted-foreground">
          Keep this page open while riding for the best updates. At the cafe, open the group map to
          see where the other half is.
        </p>
      ) : null}
    </div>
  );
}

function RiderList({
  riders,
  currentRiderId,
  selectedRiderId,
  onSelectRider,
}: {
  riders: RideRider[];
  currentRiderId: string | null;
  selectedRiderId: string | null;
  onSelectRider: (riderId: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="display text-3xl">Group</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tap a rider for individual tracking.</p>
      <div className="mt-4 space-y-3">
        {riders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No riders have joined yet.</p>
        ) : (
          riders.map((rider) => (
            <button
              key={rider.id}
              type="button"
              onClick={() => onSelectRider(rider.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                selectedRiderId === rider.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <div>
                <div className="font-medium">
                  {rider.name}
                  {rider.id === currentRiderId ? " (you)" : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rider.isSharing ? formatLastSeen(rider.updatedAt) : "Not sharing location"}
                  {rider.isSharing && formatSpeed(rider.speedKmh)
                    ? ` · ${formatSpeed(rider.speedKmh)}`
                    : null}
                </div>
              </div>
              <MapPin className="h-4 w-4 text-primary" />
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function RiderDetail({
  rider,
  currentRider,
  onClear,
}: {
  rider: RideRider | null;
  currentRider: RideRider | null;
  onClear: () => void;
}) {
  if (!rider) {
    return (
      <section className="rounded-3xl border border-dashed border-border bg-muted/20 p-6">
        <h2 className="display text-3xl">Individual tracker</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a rider from the group list or tap their marker on the map.
        </p>
      </section>
    );
  }

  const distanceFromYou =
    currentRider?.latitude != null &&
    currentRider.longitude != null &&
    rider.latitude != null &&
    rider.longitude != null &&
    rider.id !== currentRider.id
      ? formatDistance(
          haversineKm(
            currentRider.latitude,
            currentRider.longitude,
            rider.latitude,
            rider.longitude,
          ),
        )
      : null;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="display text-3xl">{rider.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Individual tracker</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-primary hover:underline"
        >
          Back to group
        </button>
      </div>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">Status</dt>
          <dd className="mt-1 font-medium">
            {rider.isSharing ? "Sharing location" : "Not sharing right now"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">Last update</dt>
          <dd className="mt-1 font-medium">{formatLastSeen(rider.updatedAt)}</dd>
        </div>
        {rider.isSharing && formatSpeed(rider.speedKmh) ? (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Speed</dt>
            <dd className="mt-1 font-medium">{formatSpeed(rider.speedKmh)}</dd>
          </div>
        ) : null}
        {distanceFromYou ? (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Distance from you</dt>
            <dd className="mt-1 font-medium">{distanceFromYou}</dd>
          </div>
        ) : null}
        {rider.latitude != null && rider.longitude != null ? (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Coordinates</dt>
            <dd className="mt-1 font-medium">
              {rider.latitude.toFixed(5)}, {rider.longitude.toFixed(5)}
            </dd>
          </div>
        ) : (
          <p className="text-muted-foreground">No location received yet.</p>
        )}
      </dl>
    </section>
  );
}

function EmptyRideState({
  showAdmin,
  onToggleAdmin,
  adminPassword,
  onAdminPasswordChange,
  onStart,
  isStarting,
  startError,
}: {
  showAdmin: boolean;
  onToggleAdmin: () => void;
  adminPassword: string;
  onAdminPasswordChange: (value: string) => void;
  onStart: () => void;
  isStarting: boolean;
  startError: string | null;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
      <h2 className="display text-3xl">No ride live yet</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        When a ride lead starts Sunday&apos;s ride, everyone can opt in here and appear on the
        shared map.
      </p>
      <button
        type="button"
        onClick={onToggleAdmin}
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        {showAdmin ? "Hide ride lead controls" : "Ride lead: start today&apos;s ride"}
      </button>
      {showAdmin ? (
        <form
          className="mt-4 max-w-sm space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <input
            type="password"
            value={adminPassword}
            onChange={(event) => onAdminPasswordChange(event.target.value)}
            placeholder="Ride admin password"
            required
            className="w-full rounded-xl border border-input bg-background px-4 py-3"
          />
          {startError ? <p className="text-sm text-destructive">{startError}</p> : null}
          <button
            type="submit"
            disabled={isStarting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground"
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start Sunday ride
          </button>
        </form>
      ) : null}
    </div>
  );
}

function AdminPanel({
  showAdmin,
  onToggleAdmin,
  adminPassword,
  onAdminPasswordChange,
  onEnd,
  isEnding,
  endError,
}: {
  showAdmin: boolean;
  onToggleAdmin: () => void;
  adminPassword: string;
  onAdminPasswordChange: (value: string) => void;
  onEnd: () => void;
  isEnding: boolean;
  endError: string | null;
}) {
  return (
    <div className="rounded-3xl border border-border bg-muted/20 p-6">
      <button
        type="button"
        onClick={onToggleAdmin}
        className="text-sm font-medium text-primary hover:underline"
      >
        {showAdmin ? "Hide ride lead controls" : "Ride lead: end ride for everyone"}
      </button>
      {showAdmin ? (
        <form
          className="mt-4 max-w-sm space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onEnd();
          }}
        >
          <input
            type="password"
            value={adminPassword}
            onChange={(event) => onAdminPasswordChange(event.target.value)}
            placeholder="Ride admin password"
            required
            className="w-full rounded-xl border border-input bg-background px-4 py-3"
          />
          {endError ? <p className="text-sm text-destructive">{endError}</p> : null}
          <button
            type="submit"
            disabled={isEnding}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-destructive"
          >
            {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            End ride & stop all sharing
          </button>
        </form>
      ) : null}
    </div>
  );
}
