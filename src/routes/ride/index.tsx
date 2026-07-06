import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, MapPin, Map, Navigation, Radio, TriangleAlert, User, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { RideMap } from "@/components/RideMap";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import {
  getMemberSession,
  loginMember,
  logoutMember,
  registerMember,
} from "@/lib/member.server";
import {
  getRideSnapshot,
  getRiderStreetLocation,
  joinRide,
  leaveRide,
  deleteRideReport,
  setRideSharing,
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
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState<RideReportType>("mechanical");
  const [reportMessage, setReportMessage] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportType, setEditReportType] = useState<RideReportType>("mechanical");
  const [editReportMessage, setEditReportMessage] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileRideTab>("map");

  const memberQuery = useQuery({
    queryKey: ["member-session"],
    queryFn: () => getMemberSession(),
  });

  const member = memberQuery.data?.member ?? null;
  const isApproved = member?.status === "approved";

  const rideQuery = useQuery({
    queryKey: ["ride-snapshot"],
    queryFn: () => getRideSnapshot(),
    refetchInterval: 10_000,
    enabled: isApproved,
    retry: false,
  });

  const snapshot = rideQuery.data;
  const currentRider =
    snapshot?.riders.find((rider) => rider.id === snapshot.currentRiderId) ?? null;
  const selectedRider =
    snapshot?.riders.find((rider) => rider.id === selectedRiderId) ?? null;
  const isOnRide = Boolean(currentRider);
  const hasStaleSession = Boolean(snapshot?.currentRiderId) && !currentRider;
  const isActive = snapshot?.ride?.status === "active";
  const isSharing = currentRider?.isSharing ?? false;
  const sharingRiderCount =
    snapshot?.riders.filter((rider) => rider.isSharing).length ?? 0;
  const sharingRiders = snapshot?.riders.filter((rider) => rider.isSharing) ?? [];
  const canViewLiveMap = Boolean(isActive || sharingRiderCount > 0);
  const showRideExplorer = canViewLiveMap || isOnRide;

  const invalidateMember = () =>
    queryClient.invalidateQueries({ queryKey: ["member-session"] });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ride-snapshot"] });

  const hasSetDefaultName = useRef(false);

  useEffect(() => {
    if (!member) {
      hasSetDefaultName.current = false;
      return;
    }
    if (member.displayName && !hasSetDefaultName.current) {
      setName(member.displayName);
      hasSetDefaultName.current = true;
    }
  }, [member]);

  const logoutMutation = useMutation({
    mutationFn: () => logoutMember(),
    onSuccess: () => {
      invalidateMember();
      queryClient.removeQueries({ queryKey: ["ride-snapshot"] });
      setName("");
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

  const requestInitialLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
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
  }, [pushLocation]);

  const joinMutation = useMutation({
    mutationFn: (riderName: string) => joinRide({ data: { name: riderName } }),
    onSuccess: () => {
      setMobileTab("map");
      invalidate();
      requestInitialLocation();
    },
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
    onSuccess: (_result, nextSharing) => {
      invalidate();
      if (nextSharing) {
        requestInitialLocation();
      }
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

  useEffect(() => {
    if (!hasStaleSession || !isActive) return;
    void leaveRide();
  }, [hasStaleSession, isActive]);

  useEffect(() => {
    if (!isOnRide || !isActive || !isSharing || !navigator.geolocation) return;

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
  }, [isOnRide, isActive, isSharing, pushLocation]);

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
        <div className={`max-w-3xl ${showRideExplorer ? "hidden sm:block" : ""}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Live tracking
          </div>
          <h1 className="mt-2 display text-4xl leading-none sm:mt-3 sm:text-5xl md:text-7xl">
            Live ride map
          </h1>
          {!member ? (
            <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
              Create a free Sloggers account to access the live ride map. Once an admin approves
              your account, you can share your location with other riders — no ride lead setup
              needed.
            </p>
          ) : (
            <>
              <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
                Share your location with other approved Sloggers while you&apos;re out on a ride.
                Perfect when the group splits and you&apos;re waiting at the cafe.
              </p>
              <p className="mt-2 hidden text-sm text-muted-foreground sm:block">
                Add this page to your phone&apos;s home screen for quick access — no app store
                needed.
              </p>
            </>
          )}
          {member ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Signed in as <span className="font-medium text-foreground">{member.displayName}</span>
              </span>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>

        {memberQuery.isLoading ? (
          <div className="mt-12 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking access…
          </div>
        ) : !member ? (
          <MemberAuthPanel
            onAuthenticated={() => {
              invalidateMember();
            }}
          />
        ) : member.status === "pending" ? (
          <PendingApprovalPanel
            displayName={member.displayName}
            onSignOut={() => logoutMutation.mutate()}
            isSigningOut={logoutMutation.isPending}
          />
        ) : member.status === "awaiting_activation" ? (
          <AwaitingActivationPanel
            email={member.email}
            onSignOut={() => logoutMutation.mutate()}
            isSigningOut={logoutMutation.isPending}
          />
        ) : member.status === "rejected" ? (
          <RejectedAccessPanel
            onSignOut={() => logoutMutation.mutate()}
            isSigningOut={logoutMutation.isPending}
          />
        ) : rideQuery.isLoading ? (
          <div className="mt-12 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading ride…
          </div>
        ) : (
        <>

        {showRideExplorer ? (
          <div className="mb-4 sm:hidden">
            <h1 className="display text-3xl leading-none">Live ride map</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot?.ride?.title ?? DEFAULT_RIDE_TITLE} · {sharingRiderCount} sharing
              {currentRider ? ` · you are ${currentRider.name}` : " · watching"}
            </p>
          </div>
        ) : null}

        <div className={`space-y-4 sm:mt-10 sm:space-y-6 ${showRideExplorer ? "mt-4" : "mt-8 sm:mt-10"}`}>
          <StatusBanner
            rideTitle={snapshot?.ride?.title}
            isActive={isActive}
            riderCount={sharingRiderCount}
          />

          {!showRideExplorer ? (
            <JoinCard
              name={name}
              accountName={member?.displayName}
              onNameChange={setName}
              onJoin={() => joinMutation.mutate(name)}
              isJoining={joinMutation.isPending}
              error={joinMutation.error instanceof Error ? joinMutation.error.message : null}
              staleSession={hasStaleSession}
              othersSharing={sharingRiderCount}
              waitingForRiders
            />
          ) : (
            <>
              {!isOnRide ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/85">
                  You&apos;re watching the live map. Your location is not being shared.
                </div>
              ) : null}

              <MobileRideTabs
                active={mobileTab}
                onChange={setMobileTab}
                reportCount={snapshot?.reports.length ?? 0}
                hasSelectedRider={Boolean(selectedRider)}
              />

              <div className="lg:hidden">
                {mobileTab === "map" ? (
                  <RideMap
                    riders={sharingRiders}
                    selectedRiderId={selectedRiderId}
                    currentRiderId={snapshot?.currentRiderId ?? null}
                    onSelectRider={handleSelectRider}
                  />
                ) : null}

                {mobileTab === "group" ? (
                  <RiderList
                    riders={sharingRiders}
                    currentRiderId={snapshot?.currentRiderId ?? null}
                    selectedRiderId={selectedRiderId}
                    onSelectRider={handleSelectRider}
                  />
                ) : null}

                {mobileTab === "rider" ? (
                  <RiderDetail
                    rider={selectedRider ?? currentRider}
                    currentRider={currentRider}
                    onClear={handleClearRider}
                    isSelfView={!selectedRider && Boolean(currentRider)}
                    isSharing={isSharing}
                    onEnableSharing={() => sharingMutation.mutate(true)}
                    isEnablingSharing={sharingMutation.isPending}
                  />
                ) : null}

                {mobileTab === "alerts" ? (
                  <div className="space-y-4">
                    {isOnRide ? reportPanel : null}
                    {reportsFeed}
                  </div>
                ) : null}

                <div className="mt-4">
                  {isOnRide ? (
                    <SharingControls
                      riderName={currentRider?.name ?? member?.displayName ?? null}
                      isSharing={isSharing}
                      locationError={locationError}
                      shareError={
                        sharingMutation.error instanceof Error ? sharingMutation.error.message : null
                      }
                      onToggleSharing={(next) => sharingMutation.mutate(next)}
                      onLeave={() => leaveMutation.mutate()}
                      isSharingUpdating={sharingMutation.isPending}
                      isLeaving={leaveMutation.isPending}
                    />
                  ) : (
                    <JoinCard
                      name={name}
                      accountName={member?.displayName}
                      onNameChange={setName}
                      onJoin={() => joinMutation.mutate(name)}
                      isJoining={joinMutation.isPending}
                      error={joinMutation.error instanceof Error ? joinMutation.error.message : null}
                      othersSharing={sharingRiderCount}
                      compact
                    />
                  )}
                </div>
              </div>

              <div className="hidden space-y-6 lg:block">
                {isOnRide ? (
                  <SharingControls
                    riderName={currentRider?.name ?? member?.displayName ?? null}
                    isSharing={isSharing}
                    locationError={locationError}
                    shareError={
                      sharingMutation.error instanceof Error ? sharingMutation.error.message : null
                    }
                    onToggleSharing={(next) => sharingMutation.mutate(next)}
                    onLeave={() => leaveMutation.mutate()}
                    isSharingUpdating={sharingMutation.isPending}
                    isLeaving={leaveMutation.isPending}
                  />
                ) : null}
                <RideMap
                  riders={sharingRiders}
                  selectedRiderId={selectedRiderId}
                  currentRiderId={snapshot?.currentRiderId ?? null}
                  onSelectRider={setSelectedRiderId}
                />

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <RiderList
                    riders={sharingRiders}
                    currentRiderId={snapshot?.currentRiderId ?? null}
                    selectedRiderId={selectedRiderId}
                    onSelectRider={setSelectedRiderId}
                  />
                  <RiderDetail
                    rider={selectedRider ?? currentRider}
                    currentRider={currentRider}
                    onClear={() => setSelectedRiderId(null)}
                    isSelfView={!selectedRider && Boolean(currentRider)}
                    isSharing={isSharing}
                    onEnableSharing={() => sharingMutation.mutate(true)}
                    isEnablingSharing={sharingMutation.isPending}
                  />
                </div>

                {isOnRide ? reportPanel : null}
                {reportsFeed}

                {!isOnRide ? (
                  <JoinCard
                    name={name}
                    accountName={member?.displayName}
                    onNameChange={setName}
                    onJoin={() => joinMutation.mutate(name)}
                    isJoining={joinMutation.isPending}
                    error={joinMutation.error instanceof Error ? joinMutation.error.message : null}
                    othersSharing={sharingRiderCount}
                    compact
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
        </>
        )}
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
        {isActive ? `${rideTitle ?? DEFAULT_RIDE_TITLE} is live` : "No riders sharing yet"}
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
    <div className="sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur-md lg:hidden">
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
  accountName,
  onNameChange,
  onJoin,
  isJoining,
  error,
  staleSession,
  othersSharing,
  waitingForRiders = false,
  compact = false,
}: {
  name: string;
  accountName?: string;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  isJoining: boolean;
  error: string | null;
  staleSession?: boolean;
  othersSharing?: number;
  waitingForRiders?: boolean;
  compact?: boolean;
}) {
  const showAccountNameReset =
    accountName && name.trim().toLowerCase() !== accountName.trim().toLowerCase();

  return (
    <form
      className={`w-full rounded-2xl border-2 border-primary/25 bg-card shadow-soft sm:max-w-md sm:rounded-3xl ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-8"
      }`}
      onSubmit={(event) => {
        event.preventDefault();
        onJoin();
      }}
    >
      <h2 className={`display ${compact ? "text-2xl" : "text-3xl"}`}>
        {compact ? "Share your location" : "Share your location"}
      </h2>
      {staleSession ? (
        <p className="mt-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-base leading-relaxed text-foreground">
          Your previous session expired. Tap below to rejoin the live map.
        </p>
      ) : compact ? (
        <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-sm sm:text-muted-foreground">
          Tap below to join and share your location on the map. One step — your phone will ask for
          location permission.
        </p>
      ) : waitingForRiders ? (
        <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-sm sm:text-muted-foreground">
          No one is sharing yet. Tap below to join and appear on the map straight away. Your phone
          will ask for location permission once.
        </p>
      ) : (
        <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-sm sm:text-muted-foreground">
          {othersSharing
            ? `${othersSharing} rider${othersSharing === 1 ? " is" : "s are"} already sharing. Tap below to join and appear on the map.`
            : "Tap below to join and share your location with other approved Sloggers."}
          {" "}Names must be unique — add an initial or nickname if yours is taken.
        </p>
      )}
      <label
        htmlFor={compact ? "ride-join-name-compact" : "ride-join-name"}
        className="mt-6 block text-sm font-semibold uppercase tracking-widest text-foreground/80"
      >
        Your name on the map
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        {accountName
          ? `Defaults to ${accountName} from your account — change it if you use a different nickname on rides.`
          : "Enter the name other riders will see on the map."}
      </p>
      <input
        id={compact ? "ride-join-name-compact" : "ride-join-name"}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder={accountName ?? "e.g. Joao, Blue, Sarah B"}
        required
        autoComplete="name"
        className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3.5 text-base text-foreground placeholder:text-foreground/45"
      />
      {showAccountNameReset ? (
        <button
          type="button"
          onClick={() => onNameChange(accountName)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          Use account name ({accountName})
        </button>
      ) : null}
      {error ? <p className="mt-3 text-base text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={isJoining || !name.trim()}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold uppercase tracking-wider text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:text-sm"
      >
        {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
        Join and share location
      </button>
    </form>
  );
}

function SharingControls({
  riderName,
  isSharing,
  locationError,
  shareError,
  onToggleSharing,
  onLeave,
  isSharingUpdating,
  isLeaving,
}: {
  riderName: string | null;
  isSharing: boolean;
  locationError: string | null;
  shareError: string | null;
  onToggleSharing: (value: boolean) => void;
  onLeave: () => void;
  isSharingUpdating: boolean;
  isLeaving: boolean;
}) {
  const isBusy = isSharingUpdating || isLeaving;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-3xl sm:px-5 sm:py-4">
      {riderName ? (
        <p className="w-full text-base font-medium text-foreground sm:text-sm">
          Joined as <span className="font-semibold text-primary">{riderName}</span>
          {!isSharing ? " — location sharing is off" : null}
        </p>
      ) : null}
      <button
        type="button"
        disabled={isBusy}
        onClick={() => onToggleSharing(!isSharing)}
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:py-2.5 sm:text-sm ${
          isSharing
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground shadow-purple"
        }`}
      >
        {isSharingUpdating ? (
          <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
        ) : (
          <Navigation className="h-5 w-5 sm:h-4 sm:w-4" />
        )}
        {isSharing ? "Sharing location" : "Share my location"}
      </button>
      <button
        type="button"
        disabled={isBusy}
        onClick={onLeave}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-base font-medium text-foreground/80 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:py-2.5 sm:text-sm"
      >
        {isLeaving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
            Leaving ride…
          </>
        ) : (
          "Leave ride"
        )}
      </button>
      {shareError ? <p className="w-full text-base text-destructive sm:text-sm">{shareError}</p> : null}
      {locationError ? <p className="w-full text-base text-destructive sm:text-sm">{locationError}</p> : null}
      {isSharing ? (
        <p className="w-full text-base leading-relaxed text-foreground/80 sm:text-sm sm:text-muted-foreground">
          Keep this page open while riding for the best updates. At the cafe, open the group map to
          see where the other half is.
        </p>
      ) : (
        <p className="w-full text-base leading-relaxed text-foreground/80 sm:text-sm sm:text-muted-foreground">
          You&apos;re on the ride map but not sharing your location. Turn sharing on when you want
          riders to see you — or keep watching everyone else without broadcasting.
        </p>
      )}
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
  isSelfView = false,
  isSharing = false,
  onEnableSharing,
  isEnablingSharing = false,
}: {
  rider: RideRider | null;
  currentRider: RideRider | null;
  onClear: () => void;
  isSelfView?: boolean;
  isSharing?: boolean;
  onEnableSharing?: () => void;
  isEnablingSharing?: boolean;
}) {
  if (!rider) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:rounded-3xl sm:p-6">
        <h2 className="display text-2xl sm:text-3xl">Individual tracker</h2>
        <p className="mt-2 text-base leading-relaxed text-foreground/85 sm:text-sm sm:text-muted-foreground">
          Select a rider from the Group tab, or tap their marker on the map.
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
          <h2 className="display text-2xl sm:text-3xl">
            {rider.name}
            {isSelfView ? " (you)" : ""}
          </h2>
          <p className="mt-1 text-base text-foreground/80 sm:text-sm sm:text-muted-foreground">
            {isSelfView ? "Your tracker" : "Individual tracker"}
          </p>
        </div>
        {!isSelfView ? (
          <button
            type="button"
            onClick={onClear}
            className="text-base text-primary hover:underline sm:text-sm"
          >
            Back to group
          </button>
        ) : null}
      </div>
      {isSelfView && !isSharing && onEnableSharing ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-base leading-relaxed text-foreground">
            Location sharing is off. Turn it on so others can see you on the map.
          </p>
          <button
            type="button"
            disabled={isEnablingSharing}
            onClick={onEnableSharing}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-50 sm:w-auto"
          >
            {isEnablingSharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Share my location
          </button>
        </div>
      ) : null}
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
          <RiderStreetLocation latitude={rider.latitude} longitude={rider.longitude} />
        ) : (
          <p className="text-muted-foreground">No location received yet.</p>
        )}
      </dl>
    </section>
  );
}

function RiderStreetLocation({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const locationQuery = useQuery({
    queryKey: ["rider-street-location", latitude.toFixed(4), longitude.toFixed(4)],
    queryFn: () => getRiderStreetLocation({ data: { latitude, longitude } }),
    staleTime: 10 * 60 * 1000,
  });

  const streetLabel = locationQuery.data?.label ?? null;

  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">Location</dt>
      <dd className="mt-1 font-medium">
        {locationQuery.isPending && !streetLabel ? (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Looking up street…
          </span>
        ) : streetLabel ? (
          streetLabel
        ) : (
          `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        )}
      </dd>
      {streetLabel ? (
        <dd className="mt-1 text-xs text-muted-foreground">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </dd>
      ) : null}
    </div>
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
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary sm:text-sm">
            Need help?
          </h2>
          <p className="mt-2 text-base leading-relaxed text-foreground/85 sm:mt-1 sm:text-sm sm:text-muted-foreground">
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
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-5 py-3 text-base font-semibold uppercase tracking-wider text-destructive disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:py-2.5 sm:text-sm"
        >
          <TriangleAlert className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
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
            <div className="text-base font-semibold sm:font-medium">{option.label}</div>
            <div className="mt-1 text-sm leading-relaxed text-foreground/75 sm:text-xs sm:text-muted-foreground">
              {option.description}
            </div>
          </label>
        ))}
      </div>
      <label className="block text-sm font-semibold uppercase tracking-widest text-foreground/80 sm:text-xs sm:font-medium sm:text-muted-foreground">
        Extra details (optional)
      </label>
      <textarea
        value={reportMessage}
        onChange={(event) => onReportMessageChange(event.target.value)}
        placeholder="e.g. Puncture on B445, or waiting at the crossroads"
        rows={3}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base sm:text-sm"
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
    <section className="rounded-2xl border border-destructive/30 bg-card p-4 shadow-soft sm:rounded-3xl sm:p-6">
      <h2 className="display text-2xl sm:text-3xl">Ride reports</h2>
      <p className="mt-2 text-base leading-relaxed text-foreground/80 sm:mt-1 sm:text-sm sm:text-muted-foreground">
        Alerts from riders sharing live. Tap a report to locate them on the map.
      </p>
      <div className="mt-4 space-y-3 sm:space-y-3">
        {reports.map((report) => {
          const isOwnReport = report.riderId === currentRiderId;
          const canManage = isOwnReport && isSharing;
          const isEditing = editingReportId === report.id;

          return (
            <div
              key={report.id}
              className="rounded-2xl border border-destructive/25 bg-background px-4 py-4 sm:px-5 sm:py-4"
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
                    className="flex w-full items-start gap-3 text-left transition active:opacity-80 sm:gap-4"
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                      <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-snug text-foreground sm:text-lg">
                        {report.riderName}
                        <span className="font-medium text-foreground/85">
                          {" "}
                          · {formatReportType(report.type)}
                        </span>
                        {isOwnReport ? (
                          <span className="font-medium text-primary"> (you)</span>
                        ) : null}
                      </span>
                      {report.message ? (
                        <p className="mt-2 text-base leading-relaxed text-foreground/90">
                          {report.message}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-medium text-foreground/70">
                        {formatReportTime(report.createdAt)}
                      </p>
                    </span>
                  </button>
                  {canManage ? (
                    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:gap-3">
                      <button
                        type="button"
                        onClick={() => onStartEdit(report)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-border bg-background px-4 text-base font-semibold text-foreground transition hover:bg-muted/40"
                      >
                        Edit report
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => onDelete(report.id)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 px-4 text-base font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-50"
                      >
                        Delete report
                      </button>
                    </div>
                  ) : isOwnReport ? (
                    <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-foreground/75">
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

function MemberAuthPanel({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () => loginMember({ data: { email, password } }),
    onSuccess: () => {
      setError(null);
      onAuthenticated();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => registerMember({ data: { email, password, displayName } }),
    onSuccess: () => {
      setError(null);
      onAuthenticated();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Registration failed.");
    },
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="mt-8 max-w-lg rounded-3xl border-2 border-primary/30 bg-card p-8 shadow-soft">
      <h2 className="display text-4xl">Sign in to ride map</h2>
      <p className="mt-3 text-muted-foreground">
        Register for a free Sloggers account. An admin will approve you, then you can share your
        live location with other riders — no passwords or ride-lead setup required.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wider ${
            mode === "login"
              ? "bg-primary text-primary-foreground"
              : "border border-border hover:bg-muted"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wider ${
            mode === "register"
              ? "bg-primary text-primary-foreground"
              : "border border-border hover:bg-muted"
          }`}
        >
          Create account
        </button>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === "login") {
            loginMutation.mutate();
          } else {
            registerMutation.mutate();
          }
        }}
      >
        {mode === "register" ? (
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Ride name
            </label>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Joao, Blue, Sarah B"
              required
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
            />
          </div>
        ) : null}
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
          />
          {mode === "register" ? (
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
          ) : (
            <Link
              to="/ride/forgot-password"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function PendingApprovalPanel({
  displayName,
  onSignOut,
  isSigningOut,
}: {
  displayName: string;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  return (
    <div className="mt-8 max-w-lg rounded-3xl border border-primary/25 bg-card p-8 shadow-soft">
      <h2 className="display text-3xl">Waiting for approval</h2>
      <p className="mt-3 text-muted-foreground">
        Thanks, {displayName}. Your account has been created and is waiting for an admin to approve
        it. Once approved, you&apos;ll receive an email with a link to activate your account.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
      >
        {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out
      </button>
    </div>
  );
}

function AwaitingActivationPanel({
  email,
  onSignOut,
  isSigningOut,
}: {
  email: string;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  return (
    <div className="mt-8 max-w-lg rounded-3xl border border-primary/25 bg-card p-8 shadow-soft">
      <h2 className="display text-3xl">Check your email</h2>
      <p className="mt-3 text-muted-foreground">
        An admin has approved your account. We sent an activation link to{" "}
        <span className="font-medium text-foreground">{email}</span>. Click the link in that email to
        finish activating your account and access the live ride map.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        The link expires in 7 days. Check your spam folder if you don&apos;t see it within a few
        minutes.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
      >
        {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out
      </button>
    </div>
  );
}

function RejectedAccessPanel({
  onSignOut,
  isSigningOut,
}: {
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  return (
    <div className="mt-8 max-w-lg rounded-3xl border border-destructive/25 bg-card p-8 shadow-soft">
      <h2 className="display text-3xl">Access not approved</h2>
      <p className="mt-3 text-muted-foreground">
        Your account was not approved for ride map access. Contact a ride lead if you think this is
        a mistake.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
      >
        {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out
      </button>
    </div>
  );
}
