import { buildMemberActivationMessage } from "./member-approval-email";
import { buildMemberActivationUrl } from "./member-site";

export async function sendMemberActivationEmailViaResend(input: {
  email: string;
  displayName: string;
  activationToken: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false as const, reason: "no_key" as const };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Southam Sloggers <onboarding@resend.dev>";
  const activationUrl = buildMemberActivationUrl(input.activationToken);
  const message = buildMemberActivationMessage({
    displayName: input.displayName,
    activationUrl,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Southam Sloggers — activate your ride map account",
      text: message,
    }),
  });

  const body = await response.text();
  let result: { message?: string } | null = null;
  try {
    result = JSON.parse(body) as { message?: string };
  } catch {
    throw new Error("Could not send the activation email via Resend.");
  }

  if (!response.ok) {
    throw new Error(result?.message || "Could not send the activation email via Resend.");
  }

  return { sent: true as const };
}

export async function sendPasswordResetEmailViaResend(input: {
  email: string;
  displayName: string;
  resetToken: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false as const, reason: "no_key" as const };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Southam Sloggers <onboarding@resend.dev>";
  const { buildMemberPasswordResetUrl } = await import("./member-site");
  const { buildPasswordResetMessage } = await import("./member-approval-email");
  const resetUrl = buildMemberPasswordResetUrl(input.resetToken);
  const message = buildPasswordResetMessage({
    displayName: input.displayName,
    resetUrl,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Southam Sloggers — reset your ride map password",
      text: message,
    }),
  });

  const body = await response.text();
  let result: { message?: string } | null = null;
  try {
    result = JSON.parse(body) as { message?: string };
  } catch {
    throw new Error("Could not send the password reset email via Resend.");
  }

  if (!response.ok) {
    throw new Error(result?.message || "Could not send the password reset email via Resend.");
  }

  return { sent: true as const };
}
