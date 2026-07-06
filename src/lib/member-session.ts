export type MemberSession = {
  memberId?: string;
};

export const memberSessionConfig = {
  name: "sloggers-member",
  password:
    process.env.SESSION_SECRET ??
    "sloggers-dev-session-secret-change-me-in-production",
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  },
};
