# Costron website (Cloudflare Pages)

Product site for **COSTRON** and **COSTRON Takeoff**. A static page plus one Pages Function that emails each request to you.
Everything runs on Cloudflare's free plan, on one platform.

```
public/                 static site (HTML, CSS, JS, _headers for security headers)
src/worker.js           Worker entry: routes /api/* and serves the static files
src/api/requests.js     POST /api/requests: validates, then emails you through Resend
src/api/config.js       tells the page whether to show the Turnstile check
src/lib/                validate.js (input checks), mail.js (Resend email)
wrangler.jsonc          Cloudflare config (static folder + Worker)
```

## Deploy (free)

1. Create a free Resend account (resend.com) and an API key with "sending access".
2. Put this folder in a GitHub repository (the files must be at the top level of the repo, with `wrangler.jsonc` in the root).
3. Cloudflare dashboard > Workers & Pages > Create application > Import a repository (Workers Builds), pick the repo.
   - Build command: leave empty
   - Deploy command: `npx wrangler deploy`
4. Open the project > Settings > Variables and Secrets, add (as secrets for the keys):
   - `OWNER_EMAIL` your email (while testing, the address you used for Resend)
   - `RESEND_API_KEY` your Resend key
   - `MAIL_FROM` optional, e.g. `Costron <hello@yourdomain.com>` once your domain is verified in Resend
5. Redeploy, then submit a test request.

Or deploy from your computer: `npx wrangler login`, then `npx wrangler deploy`, then add the variables in the dashboard.

This is a separate project, so your existing Cloudflare server is not affected.

## Spam protection (recommended, free)

- **Turnstile:** Cloudflare dashboard > Turnstile > Add widget for your site address. Add `TURNSTILE_SITE_KEY` (public) and `TURNSTILE_SECRET_KEY` (secret) as variables and redeploy.
  The form then shows the check and the function verifies it. Without these keys the check is off.
- **Rate limiting:** Security > WAF > Rate limiting rules: for path `/api/requests`, limit about 5 requests per 10 minutes per IP.
- The form also has a hidden spam-trap field.

## Security built in

- Only known form fields are accepted, cleaned and length limited. Line breaks are stripped from single-line fields (no email header injection).
- Same-origin and JSON-only requests (CSRF/CORS). Strict Content Security Policy, HTTPS and security headers through `public/_headers`.
- Emails go only to `OWNER_EMAIL`. The optional customer receipt (`CONFIRM_TO_CUSTOMER=true`) is sent only when Turnstile is on, so the form cannot be used to mail strangers.
- Keys live in Cloudflare variables, never in the page. Request details are never logged.
- Nothing is stored on a server: the email is your record, and visitors see an error if it fails to send.
