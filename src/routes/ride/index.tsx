import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Map, Navigation, Radio, TriangleAlert, User, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RideMap } from "@/components/RideMap";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import {
  endRide,
  getRideSnapshot,
  joinRide,
  leaveRide,
  deleteRideReport,
  setRideSharing,
  startRide,
  submitRideReport,
  updateRideReport,
  updateRideLocation,
} from "@/lib/ride.server";
import {
  estimateEtaToYou,
  formatDistance,
  formatEtaToYou,
  formatLastSeen,
  formatReportTime,
  formatReportType,
  formatSpeed,
  haversineKm,
  RIDE_REPORT_OPTIONS,
} from "@/lib/ride-utils";
import type { RideReport, RideReportType, RideRider } from "@/lib/ride-types";

export const Route = createFileRoute("/ride/")({
  head: () => ({
    meta: [
      { title: "Live tracking — Southam Sloggers" },
      {
        name: "description",
        content:
          "Live group tracking for Southam Sloggers. Share your location on any ride and see where everyone is.",
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

type MobileRideTab = "map" | "group" | "rider" | "alerts";

const DEFAULT_RIDE_TITLE = "Live tracking";

function RidePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState<RideReportType>("mechanical");
  const [reportMessage, setReportMessage] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportType, setEditReportType] = useState<RideReportType>("mechanical");
  const [editReportMessage, setEditReportMessage] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileRideTab>("map");

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
          title: DEFAULT_RIDE_TITLE,
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

  const reportMutation = useMutation({
    mutationFn: (input: {
      type: RideReportType;
      message?: string;
      latitude?: number;
      longitude?: number;
    }) => submitRideReport({ data: input }),
    onSuccess: () => {
      setShowReportForm(false);
      setReportMessage("");
      setMobileTab("alerts");
      invalidate();
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: (input: {
      reportId: string;
      type: RideReportType;
      message?: string;
      latitude?: number;
      longitude?: number;
    }) => updateRideReport({ data: input }),
    onSuccess: () => {
      setEditingReportId(null);
      setEditReportMessage("");
      invalidate();
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => deleteRideReport({ data: { reportId } }),
    onSuccess: () => {
      setEditingReportId(null);
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

  useEffect(() => {
    if (!isSharing) {
      setShowReportForm(false);
      setEditingReportId(null);
    }
  }, [isSharing]);

  const handleSelectRider = (riderId: string) => {
    setSelectedRiderId(riderId);
    setMobileTab("rider");
  };

  const handleClearRider = () => {
    setSelectedRiderId(null);
    setMobileTab("group");
  };

  const reportPanel = (
    <ReportPanel
      isSharing={isSharing}
      showForm={showReportForm}
      onToggleForm={() => setShowReportForm((value) => !value)}
      reportType={reportType}
      onReportTypeChange={setReportType}
      reportMessage={reportMessage}
      onReportMessageChange={setReportMessage}
      onSubmit={() =>
        reportMutation.mutate({
          type: reportType,
          message: reportMessage.trim() || undefined,
          latitude: currentRider?.latitude ?? undefined,
          longitude: currentRider?.longitude ?? undefined,
        })
      }
      isSubmitting={reportMutation.isPending}
      error={reportMutation.error instanceof Error ? reportMutation.error.message : null}
    />
  );

  const reportsFeed =
    snapshot?.reports.length ? (
      <ReportsFeed
        reports={snapshot.reports}
        currentRiderId={snapshot.currentRiderId ?? null}
        isSharing={isSharing}
        editingReportId={editingReportId}
        editReportType={editReportType}
        editReportMessage={editReportMessage}
        onSelectRider={handleSelectRider}
        onStartEdit={(report) => {
          setEditingReportId(report.id);
          setEditReportType(report.type);
          setEditReportMessage(report.message ?? "");
        }}
        onCancelEdit={() => setEditingReportId(null)}
        onEditReportTypeChange={setEditReportType}
        onEditReportMessageChange={setEditReportMessage}
        onSaveEdit={() => {
          if (!editingReportId) return;
          updateReportMutation.mutate({
            reportId: editingReportId,
            type: editReportType,
            message: editReportMessage.trim() || undefined,
            latitude: currentRider?.latitude ?? undefined,
            longitude: currentRider?.longitude ?? undefined,
          });
        }}
        onDelete={(reportId) => deleteReportMutation.mutate(reportId)}
        isSaving={updateReportMutation.isPending}
        isDeleting={deleteReportMutation.isPending}
        saveError={
          updateReportMutation.error instanceof Error ? updateReportMutation.error.message : null
        }
        deleteError={
          deleteReportMutation.error instanceof Error ? deleteReportMutation.error.message : null
        }
      />
    ) : null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <SiteNav />
      <main
        className="mx-auto max-w-6xl px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-24 sm:pt-28"
      >
        <div className={`max-w-3xl ${isJoined && isActive ? "hidden sm:block" : ""}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Live tracking
          </div>
          <h1 className="mt-2 display text-4xl leading-none sm:mt-3 sm:text-5xl md:text-7xl">
            Live ride map
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Share your location with other Sloggers while you&apos;re out on a ride. Perfect when
            the group splits and you&apos;re waiting at the cafe.
          </p>
          <p className="mt-2 hidden text-sm text-muted-foreground sm:block">
            Add this page to your phone&apos;s home screen for quick access — no app store needed.
          </p>
        </div>

        {isJoined && isActive ? (
          <div className="mb-4 sm:hidden">
            <h1 className="display text-3xl leading-none">Live ride map</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot?.ride?.title ?? DEFAULT_RIDE_TITLE} · {snapshot?.riders.length ?? 0} riders
            </p>
          </div>
        ) : null}

        <div className={`space-y-4 sm:mt-10 sm:space-y-6 ${isJoined && isActive ? "mt-4" : "mt-8 sm:mt-10"}`}>
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
              <div className="sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-30 -mx-4 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                <SharingControls
                  isSharing={isSharing}
                  locationError={locationError}
                  onToggleSharing={(next) => sharingMutation.mutate(next)}
                  onLeave={() => leaveMutation.mutate()}
                  isUpdating={sharingMutation.isPending || leaveMutation.isPending}
                />
              </div>

              <MobileRideTabs
                active={mobileTab}
                onChange={setMobileTab}
                reportCount={snapshot?.reports.length ?? 0}
                hasSelectedRider={Boolean(selectedRider)}
              />

              <div className="lg:hidden">
                {mobileTab === "map" ? (
                  <RideMap
                    riders={snapshot?.riders ?? []}
                    selectedRiderId={selectedRiderId}
                    currentRiderId={snapshot?.currentRiderId ?? null}
                    onSelectRider={handleSelectRider}
                  />
                ) : null}

                {mobileTab === "group" ? (
                  <RiderList
                    riders={snapshot?.riders ?? []}
                    currentRiderId={snapshot?.currentRiderId ?? null}
                    selectedRiderId={selectedRiderId}
                    onSelectRider={handleSelectRider}
                  />
                ) : null}

                {mobileTab === "rider" ? (
                  <RiderDetail
                    rider={selectedRider}
                    currentRider={currentRider}
                    onClear={handleClearRider}
                  />
                ) : null}

                {mobileTab === "alerts" ? (
                  <div className="space-y-4">
                    {reportPanel}
                    {reportsFeed}
                  </div>
                ) : null}
              </div>

              <div className="hidden space-y-6 lg:block">
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

                {reportPanel}
                {reportsFeed}
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:rounded-3xl sm:px-6 sm:py-4">
      <div className="inline-flex items-center gap-2 text-sm font-medium">
        <Radio className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
        {isActive ? `${rideTitle ?? DEFAULT_RIDE_TITLE} is live` : "No active ride right now"}
      </div>
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {riderCount} rider{riderCount === 1 ? "" : "s"} sharing
      </div>
    </div>
  );
}

function MobileRideTabs({
  active,
  onChange,
  reportCount,
  hasSelectedRider,
}: {
  active: MobileRideTab;
  onChange: (tab: MobileRideTab) => void;
  reportCount: number;
  hasSelectedRider: boolean;
}) {
  const tabs: Array<{
    id: MobileRideTab;
    label: string;
    icon: typeof Map;
    badge?: number;
    hint?: boolean;
  }> = [
    { id: "map", label: "Map", icon: Map },
    { id: "group", label: "Group", icon: Users },
    { id: "rider", label: "Rider", icon: User, hint: hasSelectedRider },
    { id: "alerts", label: "Alerts", icon: TriangleAlert, badge: reportCount },
  ];

  return (
    <div className="sticky top-[calc(8.5rem+env(safe-area-inset-top))] z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-muted/40 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${
                isActive
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {tab.badge}
                </span>
              ) : null}
              {tab.hint && !isActive ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
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
      className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-soft sm:rounded-3xl sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        onJoin();
      }}
    >
      <h2 className="display text-2xl sm:text-3xl">Join live tracking</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your location will only be visible to other riders who joined this ride. Names must be
        unique — if someone is already using yours, add an initial or nickname.
      </p>
      <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">
        Your name
      </label>
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="How the group knows you"
        required
        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
      />
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={isJoining}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground sm:w-auto"
      >
        {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        Share my location
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-3xl sm:px-5 sm:py-4">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => onToggleSharing(!isSharing)}
        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wider sm:w-auto ${
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
        className="min-h-11 w-full rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground sm:w-auto"
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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:rounded-3xl sm:p-6">
      <h2 className="display text-2xl sm:text-3xl">Group</h2>
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
              className={`flex w-full min-h-11 items-center justify-between rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
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
                  {rider.isSharing &&
                  (rider.latitude != null || rider.speedKmh != null) &&
                  formatSpeed(rider.speedKmh, { hasLocation: rider.latitude != null })
                    ? ` · ${formatSpeed(rider.speedKmh, { hasLocation: rider.latitude != null })}`
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
      <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:rounded-3xl sm:p-6">
        <h2 className="display text-2xl sm:text-3xl">Individual tracker</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a rider from the group list or tap their marker on the map.
        </p>
      </section>
    );
  }

  const distanceKm =
    currentRider?.latitude != null &&
    currentRider.longitude != null &&
    rider.latitude != null &&
    rider.longitude != null &&
    rider.id !== currentRider.id
      ? haversineKm(
          rider.latitude,
          rider.longitude,
          currentRider.latitude,
          currentRider.longitude,
        )
      : null;

  const distanceFromYou = distanceKm != null ? formatDistance(distanceKm) : null;
  const etaToYou =
    distanceKm != null && rider.id !== currentRider?.id
      ? formatEtaToYou(estimateEtaToYou(distanceKm, rider.speedKmh), distanceKm)
      : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="display text-2xl sm:text-3xl">{rider.name}</h2>
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
        {rider.isSharing && (rider.latitude != null || rider.speedKmh != null) ? (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Speed</dt>
            <dd className="mt-1 font-medium">
              {formatSpeed(rider.speedKmh, { hasLocation: rider.latitude != null }) ?? "—"}
            </dd>
          </div>
        ) : null}
        {distanceFromYou ? (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Distance from you</dt>
            <dd className="mt-1 font-medium">{distanceFromYou}</dd>
          </div>
        ) : null}
        {etaToYou ? (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">ETA to you</dt>
            <dd className="mt-1 font-medium">{etaToYou}</dd>
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

function ReportPanel({
  isSharing,
  showForm,
  onToggleForm,
  reportType,
  onReportTypeChange,
  reportMessage,
  onReportMessageChange,
  onSubmit,
  isSubmitting,
  error,
}: {
  isSharing: boolean;
  showForm: boolean;
  onToggleForm: () => void;
  reportType: RideReportType;
  onReportTypeChange: (value: RideReportType) => void;
  reportMessage: string;
  onReportMessageChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-soft sm:rounded-3xl sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">
            Need help?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Report an accident, mechanical, or if someone is lost — the group will see it here.
            {isSharing
              ? " You can update or delete your own reports while sharing location."
              : " Turn location sharing on to send or manage reports."}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleForm}
          disabled={!isSharing}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-destructive disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <TriangleAlert className="h-4 w-4" />
          {showForm ? "Cancel report" : "Report an issue"}
        </button>
      </div>

      {showForm && isSharing ? (
        <ReportFormFields
          reportType={reportType}
          onReportTypeChange={onReportTypeChange}
          reportMessage={reportMessage}
          onReportMessageChange={onReportMessageChange}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          error={error}
          submitLabel="Send report to group"
        />
      ) : null}
    </div>
  );
}

function ReportFormFields({
  reportType,
  onReportTypeChange,
  reportMessage,
  onReportMessageChange,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  submitLabel,
}: {
  reportType: RideReportType;
  onReportTypeChange: (value: RideReportType) => void;
  reportMessage: string;
  onReportMessageChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error: string | null;
  submitLabel: string;
}) {
  return (
    <form
      className="mt-5 space-y-4 border-t border-border pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {RIDE_REPORT_OPTIONS.map((option) => (
          <label
            key={option.type}
            className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
              reportType === option.type
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <input
              type="radio"
              name="report-type"
              value={option.type}
              checked={reportType === option.type}
              onChange={() => onReportTypeChange(option.type)}
              className="sr-only"
            />
            <div className="font-medium">{option.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
          </label>
        ))}
      </div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground">
        Extra details (optional)
      </label>
      <textarea
        value={reportMessage}
        onChange={(event) => onReportMessageChange(event.target.value)}
        placeholder="e.g. Puncture on B445, or waiting at the crossroads"
        rows={3}
        className="w-full rounded-xl border border-input bg-background px-4 py-3"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold uppercase tracking-wider text-destructive-foreground sm:w-auto"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TriangleAlert className="h-4 w-4" />}
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground sm:w-auto"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ReportsFeed({
  reports,
  currentRiderId,
  isSharing,
  editingReportId,
  editReportType,
  editReportMessage,
  onSelectRider,
  onStartEdit,
  onCancelEdit,
  onEditReportTypeChange,
  onEditReportMessageChange,
  onSaveEdit,
  onDelete,
  isSaving,
  isDeleting,
  saveError,
  deleteError,
}: {
  reports: RideReport[];
  currentRiderId: string | null;
  isSharing: boolean;
  editingReportId: string | null;
  editReportType: RideReportType;
  editReportMessage: string;
  onSelectRider: (riderId: string) => void;
  onStartEdit: (report: RideReport) => void;
  onCancelEdit: () => void;
  onEditReportTypeChange: (value: RideReportType) => void;
  onEditReportMessageChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: (reportId: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
  saveError: string | null;
  deleteError: string | null;
}) {
  return (
    <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 shadow-soft sm:rounded-3xl sm:p-6">
      <h2 className="display text-2xl sm:text-3xl">Ride reports</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Alerts from riders sharing live. Tap one to locate them on the map.
      </p>
      <div className="mt-4 space-y-3">
        {reports.map((report) => {
          const isOwnReport = report.riderId === currentRiderId;
          const canManage = isOwnReport && isSharing;
          const isEditing = editingReportId === report.id;

          return (
            <div
              key={report.id}
              className="rounded-2xl border border-destructive/20 bg-background px-4 py-3"
            >
              {isEditing ? (
                <ReportFormFields
                  reportType={editReportType}
                  onReportTypeChange={onEditReportTypeChange}
                  reportMessage={editReportMessage}
                  onReportMessageChange={onEditReportMessageChange}
                  onSubmit={onSaveEdit}
                  onCancel={onCancelEdit}
                  isSubmitting={isSaving}
                  error={saveError ?? deleteError}
                  submitLabel="Save changes"
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectRider(report.riderId)}
                    className="flex w-full items-start justify-between gap-4 text-left transition hover:opacity-90"
                  >
                    <div>
                      <div className="font-medium">
                        {report.riderName} · {formatReportType(report.type)}
                        {isOwnReport ? " (you)" : ""}
                      </div>
                      {report.message ? (
                        <p className="mt-1 text-sm text-muted-foreground">{report.message}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatReportTime(report.createdAt)}
                      </p>
                    </div>
                    <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-destructive" />
                  </button>
                  {canManage ? (
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => onStartEdit(report)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Edit report
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => onDelete(report.id)}
                        className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                      >
                        Delete report
                      </button>
                    </div>
                  ) : isOwnReport ? (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      Turn location sharing back on to edit or delete this report.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
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
        When a ride lead starts live tracking, everyone can opt in here and appear on the shared
        map.
      </p>
      <button
        type="button"
        onClick={onToggleAdmin}
        className={`mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider transition ${
          showAdmin
            ? "border border-primary/30 text-primary hover:bg-primary/5"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {showAdmin ? "Hide ride lead controls" : "Ride lead: start live tracking"}
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
            Start live tracking
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
        className={`inline-flex rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider transition ${
          showAdmin
            ? "border border-primary/30 text-primary hover:bg-primary/5"
            : "border border-primary/30 text-primary hover:bg-primary/5"
        }`}
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
