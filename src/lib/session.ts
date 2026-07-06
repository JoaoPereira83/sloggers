export const sessionConfig = {
  name: "sloggers-admin",
  password:
    process.env.SESSION_SECRET ??
    "sloggers-dev-session-secret-change-me-in-production",
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24,
    path: "/",
  },
};

export type AdminSession = {
  isAdmin?: boolean;
};
