import { z } from "zod";
import { ready } from "@/lib/db";
import { AppError, hubMessenger, rateLimit } from "@/lib/engine";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200), body: z.string().trim().min(5, "Tell us a little more").max(4000) });

/**
 * Stores a support request for the owner, then texts the owner that one is waiting (the hub sends
 * "kari" to her own alert number). The alert is a courtesy: if it fails, or twenty have already gone
 * today, the request is still saved and the visitor is still thanked.
 */
export async function POST(req: Request) {
  try {
    const sql = await ready();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    await rateLimit(sql, `support:${ip}`, 5, 3600);
    const input = schema.parse(await req.json());
    await sql`insert into support_requests (email, body) values (${input.email}, ${input.body})`;
    try {
      await rateLimit(sql, "support-alerts", 20, 86400);
      const business = input.body.startsWith("[Business enquiry]");
      await hubMessenger(sql, {
        channel: "sms", to: "kari", subject: "", type: "party_support",
        body: `Christmas Together ${business ? "BUSINESS enquiry" : "help request"} from ${input.email}: ${input.body.replace(/^\[Business enquiry\]\s*/, "").replace(/\s+/g, " ").slice(0, 240)}`,
      });
    } catch { /* saved either way */ }
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return Response.json({ error: err.issues[0]?.message ?? "Please check the form" }, { status: 400 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
