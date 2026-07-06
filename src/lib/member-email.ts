import { buildMemberApprovalMessage } from "./member-approval-email";

function getSiteUrl() {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;

  return "https://sloggers.vercel.app";
}

export async function sendMemberApprovalEmailViaResend(input: {
  email: string;
  displayName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false as const, reason: "no_key" as const };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Southam Sloggers <onboarding@resend.dev>";
  const message = buildMemberApprovalMessage({
    ...input,
    siteUrl: getSiteUrl(),
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
      subject: "Southam Sloggers — your ride map account is approved",
      text: message,
    }),
  });

  const body = await response.text();
  let result: { message?: string } | null = null;
  try {
    result = JSON.parse(body) as { message?: string };
  } catch {
    throw new Error("Could not send the approval email via Resend.");
  }

  if (!response.ok) {
    throw new Error(result?.message || "Could not send the approval email via Resend.");
  }

  return { sent: true as const };
}
