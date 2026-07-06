import { createServerFn } from "@tanstack/react-start";
import { compare, hash } from "bcryptjs";

import type { AdminSession } from "./session";
import { sessionConfig } from "./session";
import { toPublicMember } from "./member-db";
import type { MemberSession } from "./member-session";
import { memberSessionConfig } from "./member-session";
import type { MemberSessionInfo, PublicMember } from "./member-types";
import { normalizeRideName } from "./ride-utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

function validateDisplayName(displayName: string) {
  const name = normalizeRideName(displayName);
  if (!name) {
    throw new Error("Please enter the name you use on rides.");
  }
  return name;
}

async function getMemberId() {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<MemberSession>(memberSessionConfig);
  return session.data.memberId ?? null;
}

async function setMemberId(memberId: string | undefined) {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<MemberSession>(memberSessionConfig);
  if (memberId) {
    await session.update({ memberId });
  } else {
    await session.clear();
  }
}

async function requireAdmin() {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<AdminSession>(sessionConfig);
  if (!session.data.isAdmin) {
    throw new Error("Unauthorized");
  }
}

export async function requireApprovedMember() {
  const memberId = await getMemberId();
  if (!memberId) {
    throw new Error("Sign in to access the live ride map.");
  }

  const { findMemberById } = await import("./member-store");
  const member = await findMemberById(memberId);
  if (!member) {
    await setMemberId(undefined);
    throw new Error("Your session expired. Please sign in again.");
  }

  if (member.status === "pending") {
    throw new Error("Your account is waiting for admin approval.");
  }

  if (member.status === "awaiting_activation") {
    throw new Error("Please click the activation link in your approval email to finish setting up your account.");
  }

  if (member.status === "rejected") {
    throw new Error("Your account was not approved for ride map access.");
  }

  return member;
}

export const getMemberSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemberSessionInfo> => {
    const memberId = await getMemberId();
    if (!memberId) {
      return { member: null };
    }

    const { findMemberById } = await import("./member-store");
    const member = await findMemberById(memberId);
    if (!member) {
      await setMemberId(undefined);
      return { member: null };
    }

    return { member: toPublicMember(member) };
  },
);

export const registerMember = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; displayName: string }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    validateEmail(email);
    validatePassword(data.password);
    const displayName = validateDisplayName(data.displayName);

    const { findMemberByEmail, createMember } = await import("./member-store");
    const existing = await findMemberByEmail(email);
    if (existing) {
      throw new Error("An account with this email already exists. Try signing in.");
    }

    const passwordHash = await hash(data.password, 10);
    const member = await createMember({ email, displayName, passwordHash });
    await setMemberId(member.id);

    return { member: toPublicMember(member) };
  });

export const loginMember = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    validateEmail(email);

    const { findMemberByEmail } = await import("./member-store");
    const member = await findMemberByEmail(email);
    if (!member) {
      throw new Error("No account found with that email.");
    }

    const valid = await compare(data.password, member.passwordHash);
    if (!valid) {
      throw new Error("Incorrect password.");
    }

    await setMemberId(member.id);
    return { member: toPublicMember(member) };
  });

export const logoutMember = createServerFn({ method: "POST" }).handler(async () => {
  await setMemberId(undefined);
  return { ok: true as const };
});

export const listMembersForAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { listMembers } = await import("./member-store");
  const members = await listMembers();
  return members.map(toPublicMember) satisfies PublicMember[];
});

export const approveMember = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const { findMemberById, issueMemberActivation } = await import("./member-store");
    const { buildMemberActivationUrl } = await import("./member-site");
    const existing = await findMemberById(data.memberId);
    if (!existing) {
      throw new Error("Member not found.");
    }

    if (existing.status === "approved") {
      throw new Error("This member is already active.");
    }

    const { member, token } = await issueMemberActivation(data.memberId);
    const publicMember = toPublicMember(member);
    const activationUrl = buildMemberActivationUrl(token);
    let emailSent = false;

    if (existing.status !== "approved") {
      try {
        const { sendMemberActivationEmailViaResend } = await import("./member-email");
        const result = await sendMemberActivationEmailViaResend({
          email: member.email,
          displayName: member.displayName,
          activationToken: token,
        });
        emailSent = result.sent;
      } catch (error) {
        console.error("Failed to send member activation email via Resend:", error);
      }
    }

    return { member: publicMember, emailSent, activationUrl };
  });

export const activateMemberAccount = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const token = data.token.trim();
    if (!token) {
      throw new Error("Activation link is invalid.");
    }

    const { activateMemberByToken } = await import("./member-store");
    const member = await activateMemberByToken(token);
    await setMemberId(member.id);
    return { member: toPublicMember(member) };
  });

export const rejectMember = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const { updateMemberStatus } = await import("./member-store");
    const member = await updateMemberStatus(data.memberId, "rejected");
    return { member: toPublicMember(member) };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    validateEmail(email);

    const { issuePasswordReset } = await import("./member-store");
    const { buildMemberPasswordResetUrl } = await import("./member-site");
    const result = await issuePasswordReset(email);

    if (!result) {
      return { sent: false as const, resetUrl: null, displayName: null, email: null };
    }

    let emailSent = false;
    try {
      const { sendPasswordResetEmailViaResend } = await import("./member-email");
      const resendResult = await sendPasswordResetEmailViaResend({
        email: result.member.email,
        displayName: result.member.displayName,
        resetToken: result.token,
      });
      emailSent = resendResult.sent;
    } catch (error) {
      console.error("Failed to send password reset email via Resend:", error);
    }

    return {
      sent: emailSent,
      resetUrl: emailSent ? null : buildMemberPasswordResetUrl(result.token),
      displayName: result.member.displayName,
      email: result.member.email,
    };
  });

export const resetMemberPassword = createServerFn({ method: "POST" })
  .validator((data: { token: string; password: string }) => data)
  .handler(async ({ data }) => {
    const token = data.token.trim();
    if (!token) {
      throw new Error("Reset link is invalid.");
    }

    validatePassword(data.password);
    const passwordHash = await hash(data.password, 10);

    const { resetPasswordByToken } = await import("./member-store");
    const member = await resetPasswordByToken(token, passwordHash);
    await setMemberId(member.id);
    return { member: toPublicMember(member) };
  });
