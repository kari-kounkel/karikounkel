import { ready } from "@/lib/db";
import { purgeExpired, rateLimit, sendExpiryReminders } from "@/lib/engine";
import { supabaseStore } from "@/lib/storage";

/**
 * The daily round, called by Vercel's scheduler: warn people before their party is deleted,
 * then delete parties whose time is up, along with their photos.
 * Safe to call more than once: each reminder is sent once per party and deletion is by expiry date.
 * If CRON_SECRET is set, the caller must present it; either way calls are rate-limited.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  try {
    const sql = await ready();
    await rateLimit(sql, "cron", 6, 3600);
    const reminders = await sendExpiryReminders(sql);
    const { parties, paths } = await purgeExpired(sql);
    let photosRemoved = 0;
    if (paths.length) {
      try {
        await supabaseStore().remove(paths);
        photosRemoved = paths.length;
      } catch (err) {
        // The records are gone; note the files so they can be swept by hand rather than silently orphaned.
        await sql`insert into error_log (scope, message) values ('cron', ${`photo removal failed for ${paths.length} files: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`})`;
      }
    }
    return Response.json({ ok: true, reminders, partiesDeleted: parties, photosRemoved });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message.slice(0, 120) : "error" }, { status: 500 });
  }
}
