import { ZodError } from "zod";
import { ready } from "@/lib/db";
import { AppError, rateLimit, recoverLinks } from "@/lib/engine";

/** "Lost your link?" Re-sends personal links to the contact on file. The answer never says whether anything was found. */
export async function POST(req: Request) {
  try {
    const sql = await ready();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    await rateLimit(sql, `recover-ip:${ip}`, 10, 3600);
    const { contact } = (await req.json()) as { contact?: unknown };
    await recoverLinks(sql, contact);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
    if (err instanceof ZodError) return Response.json({ error: "That does not look like an email address" }, { status: 400 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
