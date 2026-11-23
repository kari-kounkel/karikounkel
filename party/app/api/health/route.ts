import { ready } from "@/lib/db";

/** Says whether the app can reach its database and has its settings. Reveals no values. */
export async function GET() {
  const settings = { DATABASE_URL: !!process.env.DATABASE_URL, INVITE_KEY: !!process.env.INVITE_KEY, STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY };
  try {
    const sql = await ready();
    const [{ n }] = await sql`select count(*)::int as n from parties`;
    return Response.json({ ok: true, database: "connected", parties: n, settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ ok: false, database: err instanceof Error ? err.message.slice(0, 120) : "error", settings }, { status: 503 });
  }
}
