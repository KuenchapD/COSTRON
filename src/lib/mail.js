const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// One email through Resend's HTTPS API.
async function send(env, { to, subject, text, html, replyTo }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM || "Costron Website <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
      html,
      reply_to: replyTo,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

// Notification to the owner. Reply-To is the customer, so you can answer directly.
export async function sendOwnerEmail(env, r) {
  const rows = [
    ["Product", r.product],
    ["Name", r.name],
    ["Company", r.company || "-"],
    ["Email", r.email],
    ["Phone", r.phone || "-"],
    ["Users", r.users || "-"],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nMessage:\n${r.message || "-"}`;
  const html =
    `<h2>New request: ${esc(r.product)}</h2><table cellpadding="6">` +
    rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join("") +
    `</table><p><b>Message</b><br>${esc(r.message || "-").replace(/\n/g, "<br>")}</p>`;
  await send(env, { to: env.OWNER_EMAIL, replyTo: r.email, subject: `Costron request: ${r.product} – ${r.name}`, text, html });
}

// Optional receipt to the customer (needs a verified domain in Resend; keep Turnstile on).
export async function sendCustomerConfirmation(env, r) {
  const text = `Hi ${r.name},\n\nThanks for your interest in ${r.product}. We received your request and will reply by email soon.\n\n– Costron`;
  const html = `<p>Hi ${esc(r.name)},</p><p>Thanks for your interest in <b>${esc(r.product)}</b>. We received your request and will reply by email soon.</p><p>– Costron</p>`;
  await send(env, { to: r.email, replyTo: env.OWNER_EMAIL, subject: "We received your Costron request", text, html });
}
