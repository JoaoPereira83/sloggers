import { JOIN_FORM_EMAIL } from "@/config/site";

export function buildMemberActivationMessage(input: {
  displayName: string;
  activationUrl: string;
}) {
  return [
    `Hi ${input.displayName},`,
    "",
    "An admin has approved your Southam Sloggers account. To finish activating it and confirm your email address, click the link below:",
    "",
    input.activationUrl,
    "",
    "This link expires in 7 days. Once activated, you can sign in and use the live ride map.",
    "",
    "If you did not request this account, you can ignore this email.",
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
    throw new Error(result.message || "Could not send the activation email.");
  }
}

/** Send from the admin browser — FormSubmit blocks most server-side requests. */
export async function sendMemberActivationEmailFromBrowser(input: {
  email: string;
  displayName: string;
  activationUrl: string;
}) {
  const clubEmail = JOIN_FORM_EMAIL?.trim();
  if (!clubEmail) {
    throw new Error("Club email is not configured for FormSubmit.");
  }

  const message = buildMemberActivationMessage({
    displayName: input.displayName,
    activationUrl: input.activationUrl,
  });
  const basePayload = {
    _subject: "Southam Sloggers — activate your ride map account",
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
        : new Error("Could not send the activation email.");
    }
  }
}

export function buildPasswordResetMessage(input: {
  displayName: string;
  resetUrl: string;
}) {
  return [
    `Hi ${input.displayName},`,
    "",
    "We received a request to reset your Southam Sloggers ride map password. Click the link below to choose a new password:",
    "",
    input.resetUrl,
    "",
    "This link expires in 1 hour. If you did not request a password reset, you can ignore this email.",
    "",
    "See you on the road,",
    "Southam Sloggers",
  ].join("\n");
}

/** Send from the user's browser — FormSubmit blocks most server-side requests. */
export async function sendPasswordResetEmailFromBrowser(input: {
  email: string;
  displayName: string;
  resetUrl: string;
}) {
  const clubEmail = JOIN_FORM_EMAIL?.trim();
  if (!clubEmail) {
    throw new Error("Club email is not configured for FormSubmit.");
  }

  const message = buildPasswordResetMessage({
    displayName: input.displayName,
    resetUrl: input.resetUrl,
  });
  const basePayload = {
    _subject: "Southam Sloggers — reset your ride map password",
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
        : new Error("Could not send the password reset email.");
    }
  }
}
