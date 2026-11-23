import { ready } from "@/lib/db";
import { AppError, screenView } from "@/lib/engine";

/** The look-only view for a shared television. The key travels in the body, never in a URL. */
export async function POST(req: Request) {
  try {
    const sql = await ready();
    const body = (await req.json().catch(() => ({}))) as { key?: unknown };
    return Response.json(await screenView(sql, body.key), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
