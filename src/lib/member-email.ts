function getClubInboxEmail() {
  return (
    process.env.FORMSUBMIT_EMAIL?.trim() ||
    process.env.VITE_FORMSUBMIT_EMAIL?.trim() ||
    "joao.jose83@gmail.com"
  );
}

function getSiteUrl() {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;

  return "https://sloggers.vercel.app";
}

function buildApprovalMessage(input: { email: string; displayName: string }) {
  const rideMapUrl = `${getSiteUrl()}/ride`;

  return [
    `Hi ${input.displayName},`,
    "",
    "Your Southam Sloggers account has been approved. You can now sign in and use the live ride map:",
    "",
    rideMapUrl,
    "",
    `This message confirms we have the correct email address for your account (${input.email}).`,
    "",
    "See you on the road,",
    "Southam Sloggers",
  ].join("\n");
}

export async function sendMemberApprovalEmail(input: {
  email: string;
  displayName: string;
}) {
  const clubEmail = getClubInboxEmail();
  const message = buildApprovalMessage(input);

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(clubEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: "Southam Sloggers — your ride map account is approved",
        _cc: input.email,
        _replyto: clubEmail,
        _captcha: "false",
        _template: "box",
        name: input.displayName,
        email: input.email,
        message,
      }),
    },
  );

  const body = await response.text();

  let result: { success?: string | boolean; message?: string } | null = null;
  try {
    result = JSON.parse(body) as { success?: string | boolean; message?: string };
  } catch {
    throw new Error("Could not send the approval email.");
  }

  const ok = result.success === true || result.success === "true";
  if (!response.ok || !ok) {
    throw new Error(result.message || "Could not send the approval email.");
  }
}
