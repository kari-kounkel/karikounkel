/**
 * The party engine: every rule about who may see or change what lives here.
 * Functions take a `sql` client so the same code runs against production and the test database.
 * Occasion-neutral — Christmas is a theme, not a special case.
 */
import type { Sql } from "postgres";
import { z } from "zod";
import { decryptToken, drawCycle, encryptToken, hashToken, newToken } from "./secrets";

/** The standard party size. A party's own limit lives on the party (parties.max_guests). */
export const MAX_GUESTS = 25;
export const MAX_PHOTOS_PER_GIFT = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const OPEN_MODE_GIFTS_PER_PAIR = 3;
export const RETENTION_DAYS = 30;
/** A party with no date yet still expires: this long after purchase. */
export const UNDATED_LIFETIME_DAYS = 90;

export const WRAPS = ["red", "green", "gold", "snow", "plaid", "stars", "candy", "kraft"] as const;
export const BOWS = ["gold", "red", "silver", "green", "white"] as const;
export const THEMES = ["classic", "snowy", "cozy"] as const;
export const REACTIONS = ["❤️", "😂", "😭", "🥹", "🎉", "🙏"] as const;

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const deny = (message = "Not allowed") => new AppError(403, "forbidden", message);
const bad = (message: string) => new AppError(400, "invalid", message);
const missing = (message = "Not found") => new AppError(404, "not_found", message);

export type Party = {
  id: string;
  occasion: string;
  name: string;
  theme: string;
  exchange_mode: "everyone" | "secret_santa" | "open";
  party_at: Date | null;
  meet_url: string | null;
  status: "active" | "opened";
  drawn_at: Date | null;
  opened_at: Date | null;
  expires_at: Date;
  is_demo: boolean;
  cancelled_at: Date | null;
  max_guests: number;
};
export type Guest = { id: string; party_id: string; name: string; email: string | null; is_host: boolean };
export type Session = { guest: Guest; party: Party };

// ---------- validation ----------

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "Links must start with https://");

const YOUTUBE_HOSTS = ["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"];

export const linkSchema = z
  .object({
    kind: z.enum(["youtube", "music", "purchase", "giftcard", "other"]),
    url: httpsUrl,
    label: z.string().trim().max(80).default(""),
  })
  .refine((l) => l.kind !== "youtube" || YOUTUBE_HOSTS.includes(new URL(l.url).hostname), {
    message: "That does not look like a YouTube link",
  });

export const giftContentSchema = z.object({
  wrap: z.enum(WRAPS).optional(),
  bow: z.enum(BOWS).optional(),
  title: z.string().trim().max(80).optional(),
  message: z.string().max(5000).optional(),
  coupon: z.string().trim().max(300).optional(),
  links: z.array(linkSchema).max(5).optional(),
});
export type GiftContent = z.infer<typeof giftContentSchema>;

export const partySettingsSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  theme: z.enum(THEMES).optional(),
  exchange_mode: z.enum(["everyone", "secret_santa", "open"]).optional(),
  party_at: z.coerce.date().nullable().optional(),
  meet_url: z
    .union([
      httpsUrl.refine((u) => new URL(u).hostname === "meet.google.com", "Paste a Google Meet link (meet.google.com/…)"),
      z.literal(""),
    ])
    .nullable()
    .optional(),
});

const nameSchema = z.string().trim().min(1, "Name is required").max(40);
const emailSchema = z.string().trim().toLowerCase().email().max(200);

function expiryFor(partyAt: Date | null, from = new Date()): Date {
  const base = partyAt ?? new Date(from.getTime() + (UNDATED_LIFETIME_DAYS - RETENTION_DAYS) * 86400_000);
  return new Date(base.getTime() + RETENTION_DAYS * 86400_000);
}

// ---------- sessions ----------

export async function sessionFromToken(sql: Sql, token: string | null | undefined): Promise<Session> {
  if (!token || token.length < 20 || token.length > 100) throw new AppError(401, "no_token", "Invitation link required");
  const rows = await sql`
    select g.id, g.party_id, g.name, g.email, g.is_host, row_to_json(p) as party
    from guests g join parties p on p.id = g.party_id
    where g.token_hash = ${hashToken(token)} and p.expires_at > now()`;
  if (!rows.length) throw new AppError(401, "bad_token", "This invitation link is not valid, or the party has ended");
  const { party, ...guest } = rows[0] as unknown as Guest & { party: Record<string, unknown> };
  await sql`update guests set first_seen_at = now() where id = ${guest.id} and first_seen_at is null`;
  return { guest, party: reviveParty(party) };
}

function reviveParty(p: Record<string, unknown>): Party {
  const d = (v: unknown) => (v ? new Date(v as string) : null);
  return {
    ...(p as unknown as Party),
    party_at: d(p.party_at),
    drawn_at: d(p.drawn_at),
    opened_at: d(p.opened_at),
    expires_at: new Date(p.expires_at as string),
    cancelled_at: d(p.cancelled_at),
  };
}

// ---------- party creation & settings ----------

export async function createParty(
  sql: Sql,
  input: { hostName: string; hostEmail?: string | null; name?: string; isDemo?: boolean; occasion?: string; capacity?: number },
): Promise<{ partyId: string; hostToken: string; hostGuestId: string }> {
  const hostName = nameSchema.parse(input.hostName);
  const token = newToken();
  const [party] = await sql`
    insert into parties (occasion, name, expires_at, is_demo, max_guests)
    values (${input.occasion ?? "christmas"}, ${input.name ?? `${hostName}'s Christmas Together`}, ${expiryFor(null)}, ${input.isDemo ?? false}, ${input.capacity ?? MAX_GUESTS})
    returning id`;
  const [host] = await sql`
    insert into guests (party_id, name, email, is_host, token_hash, token_enc)
    values (${party.id}, ${hostName}, ${input.hostEmail ?? null}, true, ${hashToken(token)}, ${encryptToken(token)})
    returning id`;
  return { partyId: party.id, hostToken: token, hostGuestId: host.id };
}

export async function updateParty(sql: Sql, s: Session, raw: unknown): Promise<void> {
  if (!s.guest.is_host) throw deny("Only the host can change party settings");
  const input = partySettingsSchema.parse(raw);
  if (input.exchange_mode && input.exchange_mode !== s.party.exchange_mode) {
    const [{ n }] = await sql`select count(*)::int as n from gifts where party_id = ${s.party.id}`;
    if (n > 0 || s.party.drawn_at) throw bad("The exchange type cannot change once gifts exist or names are drawn");
  }
  if (s.party.status === "opened" && input.party_at !== undefined) throw bad("The party has already been opened");
  const partyAt = input.party_at === undefined ? s.party.party_at : input.party_at;
  await sql`
    update parties set
      name = ${input.name ?? s.party.name},
      theme = ${input.theme ?? s.party.theme},
      exchange_mode = ${input.exchange_mode ?? s.party.exchange_mode},
      party_at = ${partyAt},
      meet_url = ${input.meet_url === undefined ? s.party.meet_url : input.meet_url || null},
      expires_at = ${s.party.status === "opened" ? s.party.expires_at : expiryFor(partyAt)}
    where id = ${s.party.id}`;
}

// ---------- guests ----------

/**
 * Adds a person to the party and returns their personal link secret.
 * The host can always do this. A guest can too (to bring a spouse, say); we record who invited whom,
 * and a guest can only ever see the links of the people they added themselves.
 */
export async function addGuest(
  sql: Sql,
  s: Session,
  raw: { name: unknown; email?: unknown; contact?: unknown },
): Promise<{ id: string; token: string }> {
  if (s.party.drawn_at) throw bad("Names are already drawn, so the guest list is locked");
  if (s.party.status === "opened") throw bad("The party has already been opened");
  const name = nameSchema.parse(raw.name);
  const contact = parseContact(raw.contact);
  const email = raw.email ? emailSchema.parse(raw.email) : contact.email;
  const token = newToken();
  return await sql.begin(async (tx) => {
    // The limit is whatever this party was bought with, read fresh under lock.
    const [{ max_guests: cap }] = await tx`select max_guests from parties where id = ${s.party.id} for no key update`;
    const [{ n }] = await tx`select count(*)::int as n from guests where party_id = ${s.party.id}`;
    if (n >= cap) throw bad(`This party holds up to ${cap} people`);
    const [g] = await tx`
      insert into guests (party_id, name, email, phone, token_hash, token_enc, invited_by)
      values (${s.party.id}, ${name}, ${email}, ${contact.phone}, ${hashToken(token)}, ${encryptToken(token)}, ${s.guest.is_host ? null : s.guest.id})
      returning id`;
    return { id: g.id as string, token };
  });
}

/** The people I added myself, with their links, so I can pass them along. Never anyone else's. */
export async function myInvites(sql: Sql, s: Session) {
  const rows = await sql`
    select id, name, email, phone, invite_count, token_enc, first_seen_at from guests
    where party_id = ${s.party.id} and invited_by = ${s.guest.id} order by created_at`;
  return rows.map((r) => ({
    id: r.id as string, name: r.name as string, hasVisited: !!r.first_seen_at, token: decryptToken(r.token_enc),
    email: r.email as string | null, phone: r.phone as string | null, invitesSent: r.invite_count as number,
  }));
}

/** A guest adds or changes their own email address. Only they and the host can see it. */
export async function setMyEmail(sql: Sql, s: Session, raw: unknown): Promise<void> {
  const email = raw === "" || raw == null ? null : emailSchema.parse(raw);
  await sql`update guests set email = ${email} where id = ${s.guest.id}`;
}

export async function removeGuest(sql: Sql, s: Session, guestId: string): Promise<void> {
  if (!s.guest.is_host) throw deny();
  if (s.party.drawn_at) throw bad("Names are already drawn, so the guest list is locked");
  if (guestId === s.guest.id) throw bad("The host cannot be removed");
  const res = await sql`delete from guests where id = ${guestId} and party_id = ${s.party.id} and not is_host`;
  if (!res.count) throw missing();
}

/** Host-only: the guest list with each personal link secret, for copying and sending. */
export async function listGuestLinks(sql: Sql, s: Session) {
  if (!s.guest.is_host) throw deny();
  const rows = await sql`
    select g.id, g.name, g.email, g.phone, g.invite_count, g.is_host, g.token_enc, g.first_seen_at, i.name as invited_by
    from guests g left join guests i on i.id = g.invited_by
    where g.party_id = ${s.party.id} order by g.created_at`;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string | null,
    isHost: r.is_host as boolean,
    hasVisited: !!r.first_seen_at,
    invitedBy: (r.invited_by as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    invitesSent: r.invite_count as number,
    token: decryptToken(r.token_enc),
  }));
}

// ---------- Secret Santa ----------

export async function drawNames(sql: Sql, s: Session): Promise<void> {
  if (!s.guest.is_host) throw deny("Only the host can draw names");
  if (s.party.exchange_mode !== "secret_santa") throw bad("This party is not a Secret Santa");
  await sql.begin(async (tx) => {
    const [p] = await tx`select drawn_at from parties where id = ${s.party.id} for no key update`;
    if (p.drawn_at) throw bad("Names have already been drawn");
    const guests = await tx`select id from guests where party_id = ${s.party.id}`;
    if (guests.length < 3) throw bad("Secret Santa needs at least 3 people");
    const pairs = drawCycle(guests.map((g) => g.id as string));
    await tx`insert into assignments ${tx(pairs.map(([giver_id, recipient_id]) => ({ party_id: s.party.id, giver_id, recipient_id })))}`;
    await tx`update parties set drawn_at = now() where id = ${s.party.id}`;
  });
}

/** A guest's own assignment only. Nobody — host included — can read anyone else's. */
export async function myAssignment(sql: Sql, s: Session): Promise<{ id: string; name: string } | null> {
  const rows = await sql`
    select g.id, g.name from assignments a join guests g on g.id = a.recipient_id
    where a.party_id = ${s.party.id} and a.giver_id = ${s.guest.id}`;
  return rows.length ? { id: rows[0].id, name: rows[0].name } : null;
}

// ---------- gifts ----------

async function assertMayGive(sql: Sql, s: Session, recipientId: string): Promise<void> {
  if (recipientId === s.guest.id) throw bad("You cannot give a gift to yourself");
  const [r] = await sql`select id from guests where id = ${recipientId} and party_id = ${s.party.id}`;
  if (!r) throw missing("That guest is not at this party");
  if (s.party.exchange_mode === "secret_santa") {
    const mine = await myAssignment(sql, s);
    if (!mine) throw bad("Names have not been drawn yet");
    if (mine.id !== recipientId) throw deny("That is not the person you drew");
  }
}

export async function createGift(sql: Sql, s: Session, recipientId: string, raw: unknown = {}): Promise<string> {
  const content = giftContentSchema.parse(raw);
  await assertMayGive(sql, s, recipientId);
  return await sql.begin(async (tx) => {
    await tx`select id from guests where id = ${s.guest.id} for no key update`;
    const [{ n }] = await tx`
      select count(*)::int as n from gifts where giver_id = ${s.guest.id} and recipient_id = ${recipientId}`;
    const limit = s.party.exchange_mode === "open" ? OPEN_MODE_GIFTS_PER_PAIR : 1;
    if (n >= limit) throw bad(limit === 1 ? "You already have a gift for this person" : `Up to ${limit} gifts per person`);
    const [g] = await tx`
      insert into gifts (party_id, giver_id, recipient_id, wrap, bow, title, message, coupon, links)
      values (${s.party.id}, ${s.guest.id}, ${recipientId}, ${content.wrap ?? "red"}, ${content.bow ?? "gold"},
              ${content.title ?? ""}, ${content.message ?? ""}, ${content.coupon ?? ""}, ${tx.json(content.links ?? [])})
      returning id`;
    return g.id as string;
  });
}

async function ownGift(sql: Sql, s: Session, giftId: string) {
  const [g] = await sql`select * from gifts where id = ${giftId} and party_id = ${s.party.id} and giver_id = ${s.guest.id}`;
  if (!g) throw missing("Gift not found");
  return g;
}

/** Autosave: applies only the fields provided. Works on drafts and on wrapped gifts until the party opens. */
export async function saveGift(sql: Sql, s: Session, giftId: string, raw: unknown): Promise<void> {
  const c = giftContentSchema.parse(raw);
  const g = await ownGift(sql, s, giftId);
  if (g.status === "wrapped" && s.party.status === "opened") throw bad("This gift has already been opened");
  await sql`
    update gifts set
      wrap = ${c.wrap ?? g.wrap}, bow = ${c.bow ?? g.bow}, title = ${c.title ?? g.title},
      message = ${c.message ?? g.message}, coupon = ${c.coupon ?? g.coupon},
      links = ${c.links === undefined ? sql.json(g.links) : sql.json(c.links)}, updated_at = now()
    where id = ${giftId}`;
}

export async function wrapGift(sql: Sql, s: Session, giftId: string): Promise<void> {
  const g = await ownGift(sql, s, giftId);
  const [{ n }] = await sql`select count(*)::int as n from gift_photos where gift_id = ${giftId} and confirmed`;
  const empty = !g.message.trim() && !g.coupon.trim() && !(g.links as unknown[]).length && n === 0;
  if (empty) throw bad("Add a message, a photo, or a link before wrapping");
  await sql`update gifts set status = 'wrapped', wrapped_at = coalesce(wrapped_at, now()), updated_at = now() where id = ${giftId}`;
}

export async function unwrapGift(sql: Sql, s: Session, giftId: string): Promise<void> {
  await ownGift(sql, s, giftId);
  if (s.party.status === "opened") throw bad("The party has already been opened");
  await sql`update gifts set status = 'draft', updated_at = now() where id = ${giftId}`;
}

export async function deleteGift(sql: Sql, s: Session, giftId: string): Promise<string[]> {
  const g = await ownGift(sql, s, giftId);
  if (g.status === "wrapped" && s.party.status === "opened") throw bad("This gift has already been opened");
  const photos = await sql`select path from gift_photos where gift_id = ${giftId}`;
  await sql`delete from gifts where id = ${giftId}`;
  return photos.map((p) => p.path as string); // caller removes these from storage
}

// ---------- photos (metadata; bytes live in private storage) ----------

export async function reservePhoto(
  sql: Sql,
  s: Session,
  giftId: string,
  input: { mime: string; sizeBytes: number },
): Promise<{ id: string; path: string }> {
  const g = await ownGift(sql, s, giftId);
  if (g.status === "wrapped" && s.party.status === "opened") throw bad("This gift has already been opened");
  if (!(PHOTO_MIMES as readonly string[]).includes(input.mime)) throw bad("Photos must be JPG, PNG, WebP, or GIF");
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) throw bad("Empty file");
  if (input.sizeBytes > MAX_PHOTO_BYTES) throw bad("Each photo can be up to 5 MB");
  return await sql.begin(async (tx) => {
    await tx`select id from gifts where id = ${giftId} for no key update`;
    // Unconfirmed reservations older than an hour are abandoned uploads; they stop counting.
    const [{ n }] = await tx`
      select count(*)::int as n from gift_photos
      where gift_id = ${giftId} and (confirmed or created_at > now() - interval '1 hour')`;
    if (n >= MAX_PHOTOS_PER_GIFT) throw bad(`Up to ${MAX_PHOTOS_PER_GIFT} photos per gift`);
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[input.mime];
    const [row] = await tx`
      insert into gift_photos (party_id, gift_id, path, mime, size_bytes)
      values (${s.party.id}, ${giftId}, ${`${s.party.id}/${giftId}/` + crypto.randomUUID() + `.${ext}`}, ${input.mime}, ${input.sizeBytes})
      returning id, path`;
    return { id: row.id as string, path: row.path as string };
  });
}

export async function confirmPhoto(sql: Sql, s: Session, photoId: string, actualBytes: number): Promise<void> {
  const [p] = await sql`
    select ph.id, ph.gift_id from gift_photos ph join gifts g on g.id = ph.gift_id
    where ph.id = ${photoId} and g.giver_id = ${s.guest.id} and ph.party_id = ${s.party.id}`;
  if (!p) throw missing("Photo not found");
  if (actualBytes <= 0 || actualBytes > MAX_PHOTO_BYTES) {
    await sql`delete from gift_photos where id = ${photoId}`;
    throw bad("Each photo can be up to 5 MB");
  }
  await sql`update gift_photos set confirmed = true, size_bytes = ${actualBytes} where id = ${photoId}`;
}

export async function removePhoto(sql: Sql, s: Session, photoId: string): Promise<string> {
  const [p] = await sql`
    select ph.path, g.status from gift_photos ph join gifts g on g.id = ph.gift_id
    where ph.id = ${photoId} and g.giver_id = ${s.guest.id} and ph.party_id = ${s.party.id}`;
  if (!p) throw missing("Photo not found");
  if (p.status === "wrapped" && s.party.status === "opened") throw bad("This gift has already been opened");
  await sql`delete from gift_photos where id = ${photoId}`;
  return p.path as string;
}

// ---------- reading ----------

export type GiftFull = {
  id: string;
  giverId: string;
  giverName: string;
  recipientId: string;
  recipientName: string;
  status: "draft" | "wrapped";
  wrap: string;
  bow: string;
  title: string;
  message: string;
  coupon: string;
  links: Array<{ kind: string; url: string; label: string }>;
  photos: Array<{ id: string; path: string }>;
  updatedAt: Date;
};

async function loadFull(sql: Sql, where: ReturnType<Sql>): Promise<GiftFull[]> {
  const rows = await sql`
    select g.*, gv.name as giver_name, rc.name as recipient_name,
      coalesce((select json_agg(json_build_object('id', ph.id, 'path', ph.path) order by ph.created_at)
                from gift_photos ph where ph.gift_id = g.id and ph.confirmed), '[]'::json) as photos
    from gifts g join guests gv on gv.id = g.giver_id join guests rc on rc.id = g.recipient_id
    where ${where} order by g.created_at`;
  return rows.map((r) => ({
    id: r.id,
    giverId: r.giver_id,
    giverName: r.giver_name,
    recipientId: r.recipient_id,
    recipientName: r.recipient_name,
    status: r.status,
    wrap: r.wrap,
    bow: r.bow,
    title: r.title,
    message: r.message,
    coupon: r.coupon,
    links: r.links,
    photos: r.photos,
    updatedAt: r.updated_at,
  }));
}

/** Gifts I am giving — drafts included, always in full. */
export function myGivenGifts(sql: Sql, s: Session): Promise<GiftFull[]> {
  return loadFull(sql, sql`g.party_id = ${s.party.id} and g.giver_id = ${s.guest.id}`);
}

/** Gifts given to me — contents exist only after the host opens the party. Before that: an empty list. */
export async function myReceivedGifts(sql: Sql, s: Session): Promise<GiftFull[]> {
  const [p] = await sql`select status from parties where id = ${s.party.id}`;
  if (p.status !== "opened") return [];
  return loadFull(sql, sql`g.party_id = ${s.party.id} and g.recipient_id = ${s.guest.id} and g.status = 'wrapped'`);
}

/** One gift, for either party to it. The recipient gets it only once opened. */
export async function getGift(sql: Sql, s: Session, giftId: string): Promise<GiftFull> {
  const [g] = await loadFull(sql, sql`g.party_id = ${s.party.id} and g.id = ${giftId}`);
  if (!g) throw missing("Gift not found");
  if (g.giverId === s.guest.id) return g;
  const [p] = await sql`select status from parties where id = ${s.party.id}`;
  if (g.recipientId === s.guest.id && g.status === "wrapped" && p.status === "opened") return g;
  throw missing("Gift not found");
}

/**
 * What everyone at the party sees under the tree: wrapped boxes and name tags. Never contents.
 * In a Secret Santa the "from" tag stays blank until the party opens.
 */
export async function treeView(sql: Sql, s: Session) {
  const [p] = await sql`select * from parties where id = ${s.party.id}`;
  const party = reviveParty(p);
  const guests = await sql`select id, name, is_host from guests where party_id = ${party.id} order by created_at`;
  const presents = await sql`
    select g.id, g.wrap, g.bow, g.giver_id, g.recipient_id from gifts g
    where g.party_id = ${party.id} and g.status = 'wrapped' order by g.wrapped_at`;
  const hideFrom = party.exchange_mode === "secret_santa" && party.status !== "opened";
  return {
    party: {
      id: party.id,
      occasion: party.occasion,
      name: party.name,
      theme: party.theme,
      exchangeMode: party.exchange_mode,
      partyAt: party.party_at,
      meetUrl: party.meet_url,
      status: party.status,
      namesDrawn: !!party.drawn_at,
      openedAt: party.opened_at,
      expiresAt: party.expires_at,
      isDemo: party.is_demo,
      maxGuests: party.max_guests,
      cancelledAt: party.cancelled_at,
    },
    me: { id: s.guest.id, name: s.guest.name, isHost: s.guest.is_host, email: s.guest.email },
    guests: guests.map((g) => ({ id: g.id as string, name: g.name as string, isHost: g.is_host as boolean })),
    presents: presents.map((g) => ({
      id: g.id as string,
      wrap: g.wrap as string,
      bow: g.bow as string,
      toId: g.recipient_id as string,
      fromId: hideFrom && g.giver_id !== s.guest.id ? null : (g.giver_id as string),
    })),
  };
}

// ---------- the big moment ----------

export async function openParty(sql: Sql, s: Session): Promise<void> {
  if (!s.guest.is_host) throw deny("Only the host can open the presents");
  const res = await sql`
    update parties set status = 'opened', opened_at = now(),
      expires_at = greatest(now(), coalesce(party_at, now())) + make_interval(days => ${RETENTION_DAYS})
    where id = ${s.party.id} and status = 'active'`;
  if (!res.count) throw bad("The presents are already open");
}

// ---------- thank-yous ----------

async function giftThreadAccess(sql: Sql, s: Session, giftId: string) {
  const [g] = await sql`
    select g.giver_id, g.recipient_id, g.status, p.status as party_status
    from gifts g join parties p on p.id = g.party_id
    where g.id = ${giftId} and g.party_id = ${s.party.id}`;
  const isParty = g && (g.giver_id === s.guest.id || g.recipient_id === s.guest.id);
  if (!isParty || g.status !== "wrapped" || g.party_status !== "opened") throw missing("Gift not found");
}

export async function postThanks(
  sql: Sql,
  s: Session,
  giftId: string,
  raw: { body?: unknown; reaction?: unknown },
): Promise<string> {
  const input = z
    .object({ body: z.string().trim().max(2000).default(""), reaction: z.enum(REACTIONS).nullish() })
    .refine((v) => v.body || v.reaction, "Write something or pick a reaction")
    .parse(raw);
  await giftThreadAccess(sql, s, giftId);
  const [m] = await sql`
    insert into gift_messages (party_id, gift_id, sender_id, body, reaction)
    values (${s.party.id}, ${giftId}, ${s.guest.id}, ${input.body}, ${input.reaction ?? null}) returning id`;
  return m.id as string;
}

export async function listThanks(sql: Sql, s: Session, giftId: string) {
  await giftThreadAccess(sql, s, giftId);
  const rows = await sql`
    select m.id, m.sender_id, g.name as sender_name, m.body, m.reaction, m.created_at
    from gift_messages m join guests g on g.id = m.sender_id
    where m.gift_id = ${giftId} order by m.created_at`;
  return rows.map((m) => ({
    id: m.id as string,
    senderId: m.sender_id as string,
    senderName: m.sender_name as string,
    body: m.body as string,
    reaction: m.reaction as string | null,
    createdAt: m.created_at as Date,
  }));
}

// ---------- rate limiting ----------

/** Fixed-window limiter backed by the database, so it holds across serverless instances. */
export async function rateLimit(sql: Sql, key: string, max: number, windowSeconds: number): Promise<void> {
  const [row] = await sql`
    insert into rate_limits (key, window_start)
    values (${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}))
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`;
  if (row.count > max) throw new AppError(429, "slow_down", "Too many requests — give it a moment");
}

// ---------- expiry ----------

/** Deletes every expired party and returns the storage paths the caller must remove. */
export async function purgeExpired(sql: Sql, now = new Date()): Promise<{ parties: number; paths: string[] }> {
  return await sql.begin(async (tx) => {
    const expired = await tx`select id from parties where expires_at <= ${now} for update skip locked`;
    const paths: string[] = [];
    for (const { id } of expired) {
      const photos = await tx`select path from gift_photos where party_id = ${id}`;
      paths.push(...photos.map((p) => p.path as string));
      const [c] = await tx`
        select (select count(*) from guests where party_id = ${id})::int as guests,
               (select count(*) from gifts where party_id = ${id})::int as gifts`;
      await tx`insert into deletion_log (party_id, guests, gifts, photos) values (${id}, ${c.guests}, ${c.gifts}, ${photos.length})`;
      await tx`delete from parties where id = ${id}`;
    }
    await tx`delete from rate_limits where window_start < now() - interval '1 day'`;
    return { parties: expired.length, paths };
  });
}

// ---------- choosing a date together ----------

export const MAX_DATE_OPTIONS = 3;

/** Host proposes up to three possible dates. This (re)opens the vote: the party has no date until one is chosen. */
export async function proposeDates(sql: Sql, s: Session, raw: unknown): Promise<void> {
  if (!s.guest.is_host) throw deny("Only the host can propose dates");
  if (s.party.status === "opened") throw bad("The party has already been opened");
  const dates = z.array(z.coerce.date()).min(1, "Add at least one date").max(MAX_DATE_OPTIONS).parse(raw);
  const unique = [...new Set(dates.map((d) => d.getTime()))].map((t) => new Date(t));
  if (unique.some((d) => d.getTime() < Date.now() - 3600_000)) throw bad("Those dates need to be in the future");
  await sql.begin(async (tx) => {
    await tx`select id from parties where id = ${s.party.id} for no key update`;
    // Dates that stay keep their votes; removed ones take their votes with them.
    await tx`delete from date_options where party_id = ${s.party.id} and not (starts_at = any(${unique}))`;
    for (const d of unique) await tx`insert into date_options (party_id, starts_at) values (${s.party.id}, ${d}) on conflict do nothing`;
    await tx`update parties set party_at = null, expires_at = ${expiryFor(null)} where id = ${s.party.id}`;
  });
}

/** A guest says which of the proposed dates they can make. Replaces their earlier answer. */
export async function voteDates(sql: Sql, s: Session, raw: unknown): Promise<void> {
  const ids = z.array(z.string().uuid()).max(MAX_DATE_OPTIONS).parse(raw);
  await sql.begin(async (tx) => {
    const options = await tx`select id from date_options where party_id = ${s.party.id}`;
    const valid = new Set(options.map((o) => o.id as string));
    if (ids.some((id) => !valid.has(id))) throw missing("That date is not on this party's list");
    await tx`delete from date_votes where guest_id = ${s.guest.id} and option_id = any(${[...valid]})`;
    for (const id of new Set(ids)) await tx`insert into date_votes (option_id, guest_id) values (${id}, ${s.guest.id})`;
  });
}

/** Host settles it: the chosen option becomes the party date. */
export async function chooseDate(sql: Sql, s: Session, optionId: string): Promise<void> {
  if (!s.guest.is_host) throw deny("Only the host can choose the date");
  if (s.party.status === "opened") throw bad("The party has already been opened");
  const [o] = await sql`select starts_at from date_options where id = ${optionId} and party_id = ${s.party.id}`;
  if (!o) throw missing("That date is not on this party's list");
  await sql`update parties set party_at = ${o.starts_at}, expires_at = ${expiryFor(o.starts_at as Date)} where id = ${s.party.id}`;
}

/** The vote as everyone at the party sees it: each date, who can make it, and whether I said yes. */
export async function datePoll(sql: Sql, s: Session) {
  const rows = await sql`
    select o.id, o.starts_at,
      coalesce((select json_agg(g.name order by g.created_at) from date_votes v join guests g on g.id = v.guest_id where v.option_id = o.id), '[]'::json) as voters,
      exists (select 1 from date_votes v where v.option_id = o.id and v.guest_id = ${s.guest.id}) as mine
    from date_options o where o.party_id = ${s.party.id} order by o.starts_at`;
  return rows.map((r) => ({ id: r.id as string, startsAt: r.starts_at as Date, voters: r.voters as string[], mine: r.mine as boolean }));
}

// ---------- invitations sent by the system (email and text) ----------

export type Message = { channel: "email" | "sms"; to: string; subject: string; body: string; html?: string; type: string };
/** How messages leave the building. Production hands them to the K Co hub; tests collect them. */
export type Messenger = (sql: Sql, m: Message) => Promise<void>;
export const hubMessenger: Messenger = async (sql, m) => {
  await sql`select send_notification(${m.channel}, ${m.to}, ${m.subject}, ${m.body}, ${m.html ?? null}, ${m.type})`;
};

export const MAX_INVITES_PER_GUEST = 3;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Accepts the ways people type a mobile number and returns it in international form, or throws. */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  const digits = t.replace(/\D/g, "");
  if (t.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw bad("That does not look like a mobile number");
}

/** One box, either kind: something with an @ is an email, anything else is treated as a mobile number. */
export function parseContact(raw: unknown): { email: string | null; phone: string | null } {
  const t = String(raw ?? "").trim();
  if (!t) return { email: null, phone: null };
  return t.includes("@") ? { email: emailSchema.parse(t), phone: null } : { email: null, phone: normalizePhone(t) };
}

async function manageableGuest(sql: Sql, s: Session, guestId: string) {
  const [g] = await sql`select id, name, email, phone, token_enc, invited_by, invite_count, is_host from guests where id = ${guestId} and party_id = ${s.party.id}`;
  if (!g) throw missing("That guest is not at this party");
  if (!s.guest.is_host && g.invited_by !== s.guest.id) throw deny("You can only do that for people you added");
  return g;
}

/** The host (or whoever added this person) records how to reach them. */
export async function setGuestContact(sql: Sql, s: Session, guestId: string, raw: unknown): Promise<void> {
  const g = await manageableGuest(sql, s, guestId);
  const c = parseContact(raw);
  await sql`update guests set email = ${c.email ?? (c.phone ? g.email : null)}, phone = ${c.phone ?? (c.email ? g.phone : null)} where id = ${guestId}`;
}

/**
 * Sends a guest their personal link by email and/or text, to whatever contact details are on file.
 * Limited to a few sends per guest and a daily budget per party, so the system cannot be used to pester anyone.
 */
export async function sendInvitation(sql: Sql, s: Session, guestId: string, send: Messenger = hubMessenger): Promise<{ email: boolean; sms: boolean }> {
  const g = await manageableGuest(sql, s, guestId);
  if (g.is_host) throw bad("That is you");
  if (!g.email && !g.phone) throw bad("Add an email or mobile number for this guest first");
  if (g.invite_count >= MAX_INVITES_PER_GUEST) throw bad(`An invitation has already gone to ${g.name} ${MAX_INVITES_PER_GUEST} times`);
  await rateLimit(sql, `invites:${s.party.id}`, 80, 86400);

  const base = (process.env.APP_URL ?? "https://party.karikounkel.com").replace(/\/$/, "");
  const link = `${base}/christmas/tree#t=${decryptToken(g.token_enc)}`;
  const from = s.guest.name;
  const party = s.party.name;
  if (g.email) {
    await send(sql, {
      channel: "email", type: "party_invitation", to: g.email,
      subject: `${from} invited you to ${party}`,
      body: `Hi ${g.name},\n\n${from} invited you to ${party}, a Christmas celebration you can join from anywhere.\n\nOpen your personal invitation:\n${link}\n\nThis link is your key to the party, so please keep it to yourself. No account or app is needed.\n\nIf you were not expecting this, you can ignore it.`,
      html: `<div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#2a1a12;max-width:560px;margin:0 auto">
<p style="font-size:18px">Hi ${esc(g.name)},</p>
<p style="font-size:18px"><strong>${esc(from)}</strong> invited you to <strong>${esc(party)}</strong>, a Christmas celebration you can join from anywhere.</p>
<p style="margin:26px 0"><a href="${link}" style="display:inline-block;background:#b3152d;color:#fff;text-decoration:none;padding:16px 28px;border-radius:12px;font-weight:700;font-size:18px">Open my invitation</a></p>
<p style="font-size:15px;color:#5a4a3a">This link is your key to the party, so please keep it to yourself. No account or app is needed.</p>
<p style="font-size:13px;color:#8a7a6a">If you were not expecting this, you can ignore it.</p></div>`,
    });
  }
  if (g.phone) {
    await send(sql, {
      channel: "sms", type: "party_invitation", to: g.phone, subject: "",
      body: `${from} invited you to ${party}. Your personal link (it is your key, keep it to yourself): ${link}`,
    });
  }
  await sql`update guests set invited_at = now(), invite_count = invite_count + 1 where id = ${guestId}`;
  return { email: !!g.email, sms: !!g.phone };
}

// ---------- the daily round: reminders before deletion, then deletion ----------

const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });

/**
 * Warns everyone with an email on file seven days and one day before their party is deleted.
 * Each warning is sent once per party. Returns how many messages went out.
 */
export async function sendExpiryReminders(sql: Sql, send: Messenger = hubMessenger, now = new Date()): Promise<number> {
  const base = (process.env.APP_URL ?? "https://party.karikounkel.com").replace(/\/$/, "");
  let sent = 0;
  for (const [column, days, label] of [["reminder_7d_at", 7, "in one week"], ["reminder_24h_at", 1, "tomorrow"]] as const) {
    const due = await sql`
      select id, name, expires_at from parties
      where expires_at > ${now} and expires_at <= ${new Date(now.getTime() + days * 86400_000)} and ${sql(column)} is null`;
    for (const p of due) {
      // Claim it first, so two runs at once cannot both send.
      const claimed = await sql`update parties set ${sql(column)} = now() where id = ${p.id} and ${sql(column)} is null returning id`;
      if (!claimed.length) continue;
      const guests = await sql`select name, email, token_enc from guests where party_id = ${p.id} and email is not null`;
      for (const g of guests) {
        const link = `${base}/christmas/tree#t=${decryptToken(g.token_enc)}`;
        const when = longDate(new Date(p.expires_at));
        try {
          await send(sql, {
            channel: "email", type: "party_expiry", to: g.email,
            subject: `${p.name} will be deleted ${label}`,
            body: `Hi ${g.name},\n\n${p.name} and everything in it (letters, photos, thank-yous) will be permanently deleted on ${when}.\n\nIf there is anything you want to keep, open your party and save it before then:\n${link}\n\nAfter that date it cannot be recovered.`,
          });
          sent++;
        } catch { /* one bad address must not stop the rest */ }
      }
    }
  }
  return sent;
}
