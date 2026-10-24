// Rajasthan Job: creates a Razorpay order for ONE job's paid details. Price comes from the database, never from the browser.
// Body: { job_id, email, phone? }   Returns: { order_id, amount, price }
// Secrets: RJ_ALLOWED_ORIGINS (comma list, default https://saifanw.github.io)
//          RJ_RAZORPAY_KEY_ID / RJ_RAZORPAY_KEY_SECRET (optional; fall back to RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)
// Deploy: supabase functions deploy rj-job-order --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ORIGINS = (Deno.env.get("RJ_ALLOWED_ORIGINS") || "https://saifanw.github.io").split(",").map((s) => s.trim()).filter(Boolean);
const JOB_RE = /^[A-Za-z0-9_-]{4,80}$/;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINS.includes(o);
  return { ok, h: { "Access-Control-Allow-Origin": ok ? o : ORIGINS[0], "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json" } };
}
const out = (status: number, body: unknown, h: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: h });

Deno.serve(async (req: Request) => {
  const { ok, h } = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (!ok) return out(403, { error: "Not allowed" }, h);
  if (req.method !== "POST") return out(405, { error: "POST only" }, h);
  try {
    const b = await req.json();
    const jobId = String(b.job_id || "");
    const email = String(b.email || "").trim().toLowerCase();
    const phone = String(b.phone || "").replace(/\D/g, "").slice(-12);
    if (!JOB_RE.test(jobId)) return out(400, { error: "Invalid job" }, h);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120) return out(400, { error: "Valid email daliye" }, h);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await sb.from("rj_job_premium").select("*").eq("job_id", jobId).maybeSingle();
    const hasData = row && [row.hr_name, row.hr_phone, row.hr_whatsapp, row.hr_email, row.career_url, row.insider_note].some((v: unknown) => String(v || "").trim());
    if (!hasData || !(row.price > 0)) return out(400, { error: "Is job par premium details available nahi hain" }, h);

    const keyId = Deno.env.get("RJ_RAZORPAY_KEY_ID") || Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RJ_RAZORPAY_KEY_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: row.price * 100, currency: "INR", receipt: "rj_" + Date.now(),
        notes: { app: "rjob", job_id: jobId, email, phone, price: String(row.price) } }),
    });
    const o = await r.json();
    if (!r.ok) { console.error("razorpay order error", JSON.stringify(o)); return out(502, { error: "Payment start nahi ho payi. Dobara try kijiye." }, h); }
    return out(200, { order_id: o.id, amount: o.amount, price: row.price }, h);
  } catch (e) { console.error(e); return out(500, { error: "Kuch gadbad ho gayi" }, h); }
});
