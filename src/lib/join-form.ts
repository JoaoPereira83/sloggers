const EXPERIENCE_LABELS: Record<string, string> = {
  new: "New to road cycling",
  returning: "Returning after a break",
  regular: "Ride weekly",
  strong: "Strong club rider",
};

export type JoinRequest = {
  name: string;
  email: string;
  experience: string;
  message: string;
};

function normalizeJoinRequest(data: JoinRequest) {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const experience = data.experience.trim();
  const message = data.message.trim();

  if (!name || name.length > 120) {
    throw new Error("Please enter your name.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!EXPERIENCE_LABELS[experience]) {
    throw new Error("Please select your riding experience.");
  }
  if (message.length > 500) {
    throw new Error("Message is too long.");
  }

  return { name, email, experience, message };
}

function getRecipientEmail() {
  const email =
    import.meta.env.VITE_FORMSUBMIT_EMAIL?.trim() ||
    import.meta.env.VITE_JOIN_FORM_EMAIL?.trim();

  if (!email) {
    throw new Error(
      "The join form is not set up yet. Please try again later or contact the club directly.",
    );
  }

  return email;
}

export async function submitJoinForm(data: JoinRequest) {
  const recipientEmail = getRecipientEmail();
  const request = normalizeJoinRequest(data);
  const experienceLabel = EXPERIENCE_LABELS[request.experience];

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: `Southam Sloggers join request — ${request.name}`,
        _replyto: request.email,
        _template: "table",
        _captcha: "false",
        name: request.name,
        email: request.email,
        experience: experienceLabel,
        message: request.message || "No extra details provided.",
      }),
    },
  );

  const body = await response.text();

  let result: { success?: string | boolean; message?: string } | null = null;
  try {
    result = JSON.parse(body) as { success?: string | boolean; message?: string };
  } catch {
    throw new Error("Could not send your request. Please try again in a moment.");
  }

  const ok = result.success === true || result.success === "true";
  if (!response.ok || !ok) {
    throw new Error(result.message || "Could not send your request. Please try again.");
  }
}
