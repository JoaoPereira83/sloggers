const RIDE_TIMEZONE = "Europe/London";
const END_OF_DAY = "23:59";

type LondonDateTime = {
  dateKey: string;
  time: string;
};

export function getLondonDateTime(now = new Date()): LondonDateTime {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: RIDE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  const minute = get("minute");

  // en-GB with hour12:false can still emit "24" for midnight on some runtimes.
  if (hour === "24") hour = "00";

  return {
    dateKey: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
  };
}

export function shouldAutoEndRide(startedAt: string, now = new Date()): boolean {
  const rideStarted = getLondonDateTime(new Date(startedAt));
  const current = getLondonDateTime(now);

  if (current.dateKey > rideStarted.dateKey) {
    return true;
  }

  if (current.dateKey === rideStarted.dateKey && current.time >= END_OF_DAY) {
    return true;
  }

  return false;
}

export function hasActiveSharing(riders: { isSharing: boolean }[]): boolean {
  return riders.some((rider) => rider.isSharing);
}
