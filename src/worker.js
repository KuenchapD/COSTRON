// Cloudflare Worker entry: serves the static site from ./public (automatically) and
// handles the two API routes. Everything else falls through to the static files.
import { onRequestPost, onRequest } from "./api/requests.js";
import { onRequestGet as getConfig } from "./api/config.js";

const notFound = () =>
  new Response(JSON.stringify({ error: "Not found." }), { status: 404, headers: { "Content-Type": "application/json" } });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/requests") {
      return request.method === "POST" ? onRequestPost({ request, env }) : onRequest();
    }
    if (pathname === "/api/config" && request.method === "GET") return getConfig({ env });
    if (pathname.startsWith("/api/")) return notFound();

    return env.ASSETS.fetch(request);
  },
};
