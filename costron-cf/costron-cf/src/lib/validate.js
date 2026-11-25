const PRODUCTS = ["COSTRON", "COSTRON Takeoff", "Both – COSTRON and COSTRON Takeoff"];
const USERS = ["1", "2–5", "6–20", "20+"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Single-line fields: strip control characters and line breaks (blocks header/subject injection).
const line = (v, max) =>
  (typeof v === "string" ? v : "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// Multi-line field: keep newlines and tabs, strip other control characters.
const multiline = (v, max) =>
  (typeof v === "string" ? v : "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

// All input is untrusted. Only known fields are copied (a sneaked-in "role" is ignored),
// each typed, trimmed and length limited.
export function validate(body) {
  const b = body && typeof body === "object" ? body : {};
  if (b.website) return { honeypot: true, errors: [], data: null }; // bots fill the hidden field

  const data = {
    product: line(b.product, 60),
    name: line(b.name, 100),
    company: line(b.company, 120),
    email: line(b.email, 160),
    phone: line(b.phone, 40),
    users: line(b.users, 10),
    message: multiline(b.message, 3000),
  };

  const errors = [];
  if (!PRODUCTS.includes(data.product)) errors.push("Please choose a product.");
  if (!data.name) errors.push("Name is required.");
  if (!EMAIL_RE.test(data.email)) errors.push("A valid email is required.");
  if (data.users && !USERS.includes(data.users)) errors.push("Invalid number of users.");
  return { honeypot: false, errors, data };
}
