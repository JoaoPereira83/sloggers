import { JOIN_FORM_EMAIL } from "@/config/site";

export function buildMemberApprovalMessage(input: {
  email: string;
  displayName: string;
  siteUrl: string;
}) {
  const rideMapUrl = `${input.siteUrl.replace(/\/+$/, "")}/ride`;

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

async function postToFormSubmit(
  toEmail: string,
  payload: Record<string, string>,
) {
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const body = await response.text();

  let result: { success?: string | boolean; message?: string } | null = null;
  try {
    result = JSON.parse(body) as { success?: string | boolean; message?: string };
  } catch {
    throw new Error("Could not reach the email service.");
  }

  const ok = result.success === true || result.success === "true";
  if (!ok) {
    throw new Error(result.message || "Could not send the approval email.");
  }
}

/** Send from the admin browser — FormSubmit blocks most server-side requests. */
export async function sendMemberApprovalEmailFromBrowser(input: {
  email: string;
  displayName: string;
}) {
  const clubEmail = JOIN_FORM_EMAIL?.trim();
  if (!clubEmail) {
    throw new Error("Club email is not configured for FormSubmit.");
  }

  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : "https://sloggers.vercel.app";
  const message = buildMemberApprovalMessage({ ...input, siteUrl });
  const basePayload = {
    _subject: "Southam Sloggers — your ride map account is approved",
    _captcha: "false",
    _template: "box",
    name: input.displayName,
    email: input.email,
    message,
  };

  try {
    await postToFormSubmit(input.email, basePayload);
    return;
  } catch (directError) {
    try {
      await postToFormSubmit(clubEmail, {
        ...basePayload,
        _cc: input.email,
      });
    } catch {
      throw directError instanceof Error
        ? directError
        : new Error("Could not send the approval email.");
    }
  }
}
