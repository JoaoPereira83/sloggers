export function getSiteUrl() {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;

  return "https://sloggers.vercel.app";
}

export function buildMemberActivationUrl(token: string) {
  return `${getSiteUrl()}/ride/activate?token=${encodeURIComponent(token)}`;
}
