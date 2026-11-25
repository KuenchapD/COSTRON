// Tells the page whether to show the Turnstile check (the site key is public).
export const onRequestGet = ({ env }) =>
  new Response(JSON.stringify({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "" }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
