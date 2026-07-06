export type RideStatus = "active" | "ended";

export type ActiveRide = {
  id: string;
  title: string;
  status: RideStatus;
  startedAt: string;
  meetingLabel: string;
};

export type RideRider = {
  id: string;
  name: string;
  joinedAt: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
  isSharing: boolean;
};

export type RideStore = {
  ride: ActiveRide | null;
  riders: RideRider[];
};

export type RideSnapshot = {
  ride: ActiveRide | null;
  riders: RideRider[];
  currentRiderId: string | null;
};
