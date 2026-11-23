/**
 * The party API. One endpoint, one action per request (same shape as the store's POS function).
 * The invitation secret travels in the Authorization header — never in a URL — so it stays out
 * of server logs and referrers. Every action is authorized by the engine.
 */
import { ZodError, z } from "zod";
import { ready } from "@/lib/db";
import * as e from "@/lib/engine";
import { supabaseStore, type PhotoStore } from "@/lib/storage";

const id = z.string().uuid();
const PHOTO_URL_SECONDS = 600;

type Ctx = { sql: Awaited<ReturnType<typeof ready>>; s: e.Session; body: Record<string, unknown>; store: () => PhotoStore };

async function withPhotoUrls(store: PhotoStore, gifts: e.GiftFull[]) {
  return Promise.all(
    gifts.map(async (g) => ({
      ...g,
      photos: await Promise.all(g.photos.map(async (p) => ({ id: p.id, url: await store.signedRead(p.path, PHOTO_URL_SECONDS) }))),
    })),
  );
}
const lazyUrls = (c: Ctx, gifts: e.GiftFull[]) =>
  gifts.some((g) => g.photos.length) ? withPhotoUrls(c.store(), gifts) : gifts.map((g) => ({ ...g, photos: [] }));

const actions: Record<string, (c: Ctx) => Promise<unknown>> = {
  // --- everyone ---
  tree: async ({ sql, s }) => ({
    ...(await e.treeView(sql, s)),
    assignment: s.party.exchange_mode === "secret_santa" ? await e.myAssignment(sql, s) : null,
    datePoll: await e.datePoll(sql, s),
  }),
  myGifts: async (c) => ({ gifts: await lazyUrls(c, await e.myGivenGifts(c.sql, c.s)) }),
  received: async (c) => ({ gifts: await lazyUrls(c, await e.myReceivedGifts(c.sql, c.s)) }),
  gift: async (c) => ({ gift: (await lazyUrls(c, [await e.getGift(c.sql, c.s, id.parse(c.body.giftId))]))[0] }),

  createGift: async ({ sql, s, body }) => ({ giftId: await e.createGift(sql, s, id.parse(body.recipientId), body.content ?? {}) }),
  saveGift: async ({ sql, s, body }) => (await e.saveGift(sql, s, id.parse(body.giftId), body.content), { saved: true }),
  wrapGift: async ({ sql, s, body }) => (await e.wrapGift(sql, s, id.parse(body.giftId)), { ok: true }),
  unwrapGift: async ({ sql, s, body }) => (await e.unwrapGift(sql, s, id.parse(body.giftId)), { ok: true }),
  deleteGift: async ({ sql, s, body, store }) => {
    const paths = await e.deleteGift(sql, s, id.parse(body.giftId));
    if (paths.length) await store().remove(paths);
    return { ok: true };
  },

  photoUpload: async ({ sql, s, body, store }) => {
    const input = z.object({ giftId: id, mime: z.string().max(40), sizeBytes: z.number().int() }).parse(body);
    const photo = await e.reservePhoto(sql, s, input.giftId, input);
    return { photoId: photo.id, uploadUrl: await store().signedUpload(photo.path) };
  },
  photoDone: async ({ sql, s, body, store }) => {
    const photoId = id.parse(body.photoId);
    const [row] = await sql`select path from gift_photos where id = ${photoId} and party_id = ${s.party.id}`;
    if (!row) throw new e.AppError(404, "not_found", "Photo not found");
    const size = await store().size(row.path);
    if (size === null) throw new e.AppError(400, "invalid", "The upload did not arrive — try again");
    try {
      await e.confirmPhoto(sql, s, photoId, size);
    } catch (err) {
      await store().remove([row.path]); // too big: the engine dropped the record, so drop the bytes too
      throw err;
    }
    return { ok: true };
  },
  photoRemove: async ({ sql, s, body, store }) => (await store().remove([await e.removePhoto(sql, s, id.parse(body.photoId))]), { ok: true }),

  thanks: async ({ sql, s, body }) => ({ messages: await e.listThanks(sql, s, id.parse(body.giftId)) }),
  sayThanks: async ({ sql, s, body }) => ({ id: await e.postThanks(sql, s, id.parse(body.giftId), body) }),

  // Any guest may bring someone; they see only the links of people they added themselves.
  addGuest: async ({ sql, s, body }) => e.addGuest(sql, s, { name: body.name, email: body.email, contact: body.contact }),
  setGuestContact: async ({ sql, s, body }) => (await e.setGuestContact(sql, s, id.parse(body.guestId), body.contact), { ok: true }),
  sendInvite: async ({ sql, s, body }) => ({ sent: await e.sendInvitation(sql, s, id.parse(body.guestId)) }),
  myInvites: async ({ sql, s }) => ({ guests: await e.myInvites(sql, s) }),
  setMyEmail: async ({ sql, s, body }) => (await e.setMyEmail(sql, s, body.email), { ok: true }),
  voteDates: async ({ sql, s, body }) => (await e.voteDates(sql, s, body.optionIds), { ok: true }),

  // --- host only (the engine enforces it) ---
  proposeDates: async ({ sql, s, body }) => (await e.proposeDates(sql, s, body.dates), { ok: true }),
  chooseDate: async ({ sql, s, body }) => (await e.chooseDate(sql, s, id.parse(body.optionId)), { ok: true }),
  updateParty: async ({ sql, s, body }) => (await e.updateParty(sql, s, body.settings), { ok: true }),
  removeGuest: async ({ sql, s, body }) => (await e.removeGuest(sql, s, id.parse(body.guestId)), { ok: true }),
  guestLinks: async ({ sql, s }) => ({ guests: await e.listGuestLinks(sql, s) }),
  drawNames: async ({ sql, s }) => (await e.drawNames(sql, s), { ok: true }),
  openParty: async ({ sql, s }) => (await e.openParty(sql, s), { ok: true }),
};

const READS = new Set(["tree", "myGifts", "received", "gift", "thanks", "guestLinks", "myInvites"]);

export async function POST(req: Request) {
  const sql = await ready();
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    await e.rateLimit(sql, `ip:${ip}`, 600, 60);

    const raw = await req.text();
    if (raw.length > 40_000) throw new e.AppError(413, "too_large", "Request too large");
    const body = z.record(z.string(), z.unknown()).parse(JSON.parse(raw || "{}"));
    const action = String(body.action ?? "");
    const handler = Object.hasOwn(actions, action) ? actions[action] : null;
    if (!handler) throw new e.AppError(400, "invalid", "Unknown action");

    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    const s = await e.sessionFromToken(sql, token);
    // Per-guest budgets: generous for reads (the tree polls), tighter for writes.
    await e.rateLimit(sql, `${READS.has(action) ? "r" : "w"}:${s.guest.id}`, READS.has(action) ? 240 : 120, 60);

    let store: PhotoStore | undefined;
    const result = await handler({ sql, s, body, store: () => (store ??= supabaseStore()) });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof e.AppError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof ZodError) return Response.json({ error: err.issues[0]?.message ?? "Invalid input", code: "invalid" }, { status: 400 });
    if (err instanceof SyntaxError) return Response.json({ error: "Invalid request", code: "invalid" }, { status: 400 });
    console.error("party api error:", err instanceof Error ? err.message : "unknown"); // message only — never request bodies
    await sql`insert into error_log (scope, message) values ('api', ${err instanceof Error ? err.message.slice(0, 500) : "unknown"})`.catch(() => {});
    return Response.json({ error: "Something went wrong on our side", code: "server" }, { status: 500 });
  }
}
