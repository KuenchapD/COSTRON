(function () {
  const $ = (id) => document.getElementById(id);
  $("yr").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-pick]").forEach((a) =>
    a.addEventListener("click", () => { $("product").value = a.dataset.pick; })
  );

  const setStatus = (msg, ok) => {
    const el = $("status");
    el.textContent = msg;
    el.className = ok ? "ok" : "bad";
  };

  // Optional Turnstile check: only shown when the site has a site key configured.
  let tsWidget = null;
  let tsToken = "";
  let tsEnabled = false;
  fetch("/api/config")
    .then((r) => (r.ok ? r.json() : {}))
    .then((cfg) => {
      if (!cfg.turnstileSiteKey) return;
      tsEnabled = true;
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => {
        tsWidget = window.turnstile.render("#ts", {
          sitekey: cfg.turnstileSiteKey,
          callback: (t) => { tsToken = t; },
          "expired-callback": () => { tsToken = ""; },
        });
      };
      document.head.appendChild(s);
    })
    .catch(() => {});

  $("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      product: $("product").value,
      name: $("name").value.trim(),
      company: $("company").value.trim(),
      email: $("email").value.trim(),
      phone: $("phone").value.trim(),
      users: $("users").value,
      message: $("msg").value.trim(),
      website: $("website").value, // honeypot
      turnstile: tsToken,
    };

    $("e-name").textContent = payload.name ? "" : "Please enter your name.";
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
    $("e-email").textContent = okEmail ? "" : "Please enter a valid email.";
    if (!payload.name || !okEmail) return;
    if (tsEnabled && !tsToken) { setStatus("Please complete the security check.", false); return; }

    const btn = $("submit");
    btn.disabled = true;
    setStatus("Sending...", true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      $("f").reset();
      setStatus("Thank you! Your request has been sent. We will contact you by email soon.", true);
    } catch (err) {
      setStatus(err.message, false);
    } finally {
      btn.disabled = false;
      if (tsWidget !== null) { window.turnstile.reset(tsWidget); tsToken = ""; }
    }
  });
})();
