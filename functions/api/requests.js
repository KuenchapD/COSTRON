// Cloudflare Pages Function: POST /api/requests
import { validate } from "../../src/lib/validate.js";
import { sendOwnerEmail, sendCustomerConfirmation } from "../../src/lib/mail.js";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function turnstileOk(env, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

export async function onRequestPost({ request, env }) {
  // CSRF / CORS: same-origin browsers only (or ALLOWED_ORIGINS), JSON only.
  const origin = request.headers.get("origin");
  if (origin) {
    let host = "";
    try { host = new URL(origin).host; } catch (_) {}
    const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (host !== new URL(request.url).host && !allowed.includes(origin)) return json(403, { error: "Request blocked." });
  }
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json(415, { error: "Unsupported content type." });

  const raw = await request.text();
  if (raw.length > 20000) return json(413, { error: "Request too large." });
  let body;
  try { body = JSON.parse(raw || "{}"); } catch (_) { return json(400, { error: "Invalid request." }); }

  const { honeypot, errors, data } = validate(body);
  if (honeypot) return json(200, { ok: true });
  if (errors.length) return json(400, { error: errors.join(" ") });

  // Optional captcha: enforced whenever TURNSTILE_SECRET_KEY is set.
  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await turnstileOk(env, body.turnstile, request.headers.get("CF-Connecting-IP"));
    if (!ok) return json(400, { error: "Please complete the security check and try again." });
  }

  if (!env.OWNER_EMAIL || !env.RESEND_API_KEY) {
    console.error(JSON.stringify({ event: "mail_not_configured" }));
    return json(503, { error: "Sending is not set up yet. Please try again later." });
  }

  try {
    await sendOwnerEmail(env, data);
  } catch (err) {
    // No disk here, so tell the visitor it failed instead of losing the request.
    console.error(JSON.stringify({ event: "owner_email_failed", message: err.message }));
    return json(502, { error: "We could not send your request. Please try again shortly." });
  }

  if (String(env.CONFIRM_TO_CUSTOMER) === "true" && env.TURNSTILE_SECRET_KEY) {
    await sendCustomerConfirmation(env, data).catch((err) =>
      console.error(JSON.stringify({ event: "confirmation_failed", message: err.message }))
    );
  }
  return json(201, { ok: true, emailed: true });
}

// Any other method
export const onRequest = () => json(405, { error: "Method not allowed." });
