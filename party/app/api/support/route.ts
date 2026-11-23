import { z } from "zod";
import { ready } from "@/lib/db";
import { AppError, rateLimit } from "@/lib/engine";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200), body: z.string().trim().min(5, "Tell us a little more").max(4000) });

/** Stores a support request for the owner. Sends nothing anywhere else. */
export async function POST(req: Request) {
  try {
    const sql = await ready();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    await rateLimit(sql, `support:${ip}`, 5, 3600);
    const input = schema.parse(await req.json());
    await sql`insert into support_requests (email, body) values (${input.email}, ${input.body})`;
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return Response.json({ error: err.issues[0]?.message ?? "Please check the form" }, { status: 400 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
