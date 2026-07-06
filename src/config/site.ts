/**
 * Inbox for /join form submissions (FormSubmit.co).
 * Env vars override this if set in Vercel: VITE_FORMSUBMIT_EMAIL or FORMSUBMIT_EMAIL
 */
const envEmail =
  import.meta.env.VITE_FORMSUBMIT_EMAIL?.trim() ||
  import.meta.env.FORMSUBMIT_EMAIL?.trim() ||
  "";

export const JOIN_FORM_EMAIL = envEmail || "joao.jose83@gmail.com";
