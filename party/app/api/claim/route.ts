import { ready } from "@/lib/db";
import { AppError, rateLimit } from "@/lib/engine";
import { claimHostToken } from "@/lib/orders";

/** Exchanges a paid checkout session id for the host's personal link secret. */
export async function POST(req: Request) {
  const sql = await ready();
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    await rateLimit(sql, `claim:${ip}`, 30, 60);
    const { sessionId } = (await req.json()) as { sessionId?: string };
    const token = await claimHostToken(sql, String(sessionId ?? ""));
    // 202 = paid but the party is not ready yet; the page keeps asking for a few seconds.
    return token ? Response.json({ token }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ pending: true }, { status: 202 });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
