export type RideStatus = "active" | "ended";

export type ActiveRide = {
  id: string;
  title: string;
  status: RideStatus;
  startedAt: string;
  meetingLabel: string;
};

export type RideReportType = "accident" | "mechanical" | "lost" | "other";

export type RideReport = {
  id: string;
  rideId: string;
  riderId: string;
  riderName: string;
  type: RideReportType;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export type RideRider = {
  id: string;
  name: string;
  joinedAt: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
  speedKmh: number | null;
  isSharing: boolean;
};

export type RideStore = {
  ride: ActiveRide | null;
  riders: RideRider[];
  reports: RideReport[];
};

export type RideSnapshot = {
  ride: ActiveRide | null;
  riders: RideRider[];
  reports: RideReport[];
  currentRiderId: string | null;
};
