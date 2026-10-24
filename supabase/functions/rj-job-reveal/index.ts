// Rajasthan Job: gives the paid details of ONE job to someone who really paid for it.
// Every call re-checks the payment with Razorpay, so a refunded payment stops working automatically.
// Body: { job_id, payment_id, order_id?, signature?, email? }
//   - right after checkout: payment_id + order_id + signature (proves this browser completed the payment)
//   - later / other device:  payment_id + the same email used at checkout
// Secrets: same as rj-job-order. Deploy: supabase functions deploy rj-job-reveal --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ORIGINS = (Deno.env.get("RJ_ALLOWED_ORIGINS") || "https://saifanw.github.io").split(",").map((s) => s.trim()).filter(Boolean);
const JOB_RE = /^[A-Za-z0-9_-]{4,80}$/;
const PAY_RE = /^pay_[A-Za-z0-9]{8,30}$/;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINS.includes(o);
  return { ok, h: { "Access-Control-Allow-Origin": ok ? o : ORIGINS[0], "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json" } };
}
const out = (status: number, body: unknown, h: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: h });
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function sign(msg: string, secret: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const norm = (e: unknown) => String(e || "").trim().toLowerCase();

Deno.serve(async (req: Request) => {
  const { ok, h } = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (!ok) return out(403, { error: "Not allowed" }, h);
  if (req.method !== "POST") return out(405, { error: "POST only" }, h);
  try {
    const b = await req.json();
    const jobId = String(b.job_id || ""), payId = String(b.payment_id || "").trim();
    if (!JOB_RE.test(jobId) || !PAY_RE.test(payId)) return out(400, { error: "Payment ID sahi nahi hai" }, h);

    const keyId = Deno.env.get("RJ_RAZORPAY_KEY_ID") || Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RJ_RAZORPAY_KEY_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET") || "";
    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const rz = async (path: string, body?: unknown) => {
      const r = await fetch("https://api.razorpay.com/v1" + path, { method: body ? "POST" : "GET",
        headers: { Authorization: auth, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) { console.error("razorpay", path, r.status); return null; }
      return await r.json();
    };

    let p = await rz(`/payments/${payId}`);
    if (!p) return out(404, { error: "Payment nahi mili. Payment ID check kijiye." }, h);
    if (p.notes?.app !== "rjob" || p.notes?.job_id !== jobId) return out(403, { error: "Ye payment is job ke liye nahi hai." }, h);

    // who is asking?
    const sig = String(b.signature || ""), oid = String(b.order_id || "");
    if (sig) {
      if (!oid || oid !== p.order_id || !same(await sign(`${oid}|${payId}`, keySecret), sig)) return out(403, { error: "Payment verify nahi ho payi." }, h);
    } else {
      const em = norm(b.email);
      if (!em || em !== norm(p.notes?.email)) return out(403, { error: "Email us email se match nahi hua jisse payment ki thi." }, h);
    }

    if (p.status === "authorized") p = (await rz(`/payments/${payId}/capture`, { amount: p.amount, currency: "INR" })) || p;
    if (p.status === "refunded" || (p.amount_refunded || 0) > 0) return out(403, { error: "Ye payment refund ho chuki hai." }, h);
    if (p.status !== "captured") return out(402, { error: "Payment abhi confirm nahi hui. Thodi der baad dobara try kijiye." }, h);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await sb.from("rj_job_premium").select("*").eq("job_id", jobId).maybeSingle();
    if (!row) return out(404, { error: "Details abhi available nahi hain. Humse contact kijiye." }, h);

    const up = await sb.from("rj_payments").upsert({ payment_id: p.id, order_id: p.order_id, job_id: jobId, email: norm(p.notes?.email),
      phone: String(p.notes?.phone || ""), amount: Math.round((p.amount || 0) / 100) }, { onConflict: "payment_id", ignoreDuplicates: true });
    if (up.error) console.error("rj_payments", up.error);   // never block access because of a bookkeeping problem

    const pick = (k: string) => String(row[k] || "").trim();
    return out(200, { job_title: pick("job_title"), hr_name: pick("hr_name"), hr_phone: pick("hr_phone"), hr_whatsapp: pick("hr_whatsapp"),
      hr_email: pick("hr_email"), career_url: pick("career_url"), insider_note: pick("insider_note") }, h);
  } catch (e) { console.error(e); return out(500, { error: "Kuch gadbad ho gayi" }, h); }
});
