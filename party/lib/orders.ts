/**
 * Money in, party out. Called only with Stripe events whose signature has already been verified.
 * Everything here is idempotent: Stripe retries deliveries, and a retry must never create a second party.
 */
import type { Sql } from "postgres";
import { createParty, hubMessenger, type Messenger } from "./engine";
import { capacityFrom } from "./pricing";
import { decryptToken } from "./secrets";

/** Marks our product on the Stripe payment link, so other products sold from the same Stripe account are ignored. */
export const PRODUCT_TAG = "party-together-christmas";
export const REFUND_GRACE_DAYS = 7;

type CheckoutSession = {
  id: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | null;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
};
type Charge = { payment_intent?: string | null; amount?: number; amount_refunded?: number };
export type StripeEvent = { id: string; type: string; data: { object: unknown } };

export type Outcome = "created" | "duplicate" | "ignored" | "awaiting_payment" | "refunded";

export async function handleStripeEvent(sql: Sql, event: StripeEvent, send: Messenger = hubMessenger): Promise<Outcome> {
  return await sql.begin(async (tx) => {
    // First writer wins; any redelivery of the same event stops here.
    const fresh = await tx`insert into stripe_events (event_id, type) values (${event.id}, ${event.type}) on conflict do nothing returning event_id`;
    if (!fresh.length) return "duplicate";

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const s = event.data.object as CheckoutSession;
      if (s.metadata?.product !== PRODUCT_TAG) return "ignored";
      if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return "awaiting_payment";
      // Two different events can announce the same paid session; one party per session.
      const [existing] = await tx`select id from orders where stripe_session_id = ${s.id}`;
      if (existing) return "duplicate";

      const hostName = (s.customer_details?.name || "Host").trim().split(/\s+/)[0].slice(0, 40) || "Host";
      const { partyId, hostToken } = await createParty(tx as unknown as Sql, { hostName, hostEmail: s.customer_details?.email ?? null, capacity: capacityFrom(s.metadata?.capacity) });
      await tx`
        insert into orders (stripe_session_id, stripe_payment_intent, email, amount_total, currency, ref_code, party_id)
        values (${s.id}, ${s.payment_intent ?? null}, ${s.customer_details?.email ?? null}, ${s.amount_total ?? 0},
                ${s.currency ?? "usd"}, ${s.client_reference_id?.slice(0, 80) ?? null}, ${partyId})`;
      // The receipt carries the host's link, so closing the browser tab never strands a buyer.
      // A mail failure must not undo a paid party, hence the savepoint.
      if (s.customer_details?.email) {
        const base = (process.env.APP_URL ?? "https://party.karikounkel.com").replace(/\/$/, "");
        const link = `${base}/christmas/tree#t=${hostToken}`;
        await tx.savepoint((sp) => send(sp as unknown as Sql, {
          channel: "email", type: "party_purchase", to: s.customer_details!.email!,
          subject: "Your Christmas tree is ready",
          body: `Thank you for your purchase! Your Christmas Together party is ready.\n\nOpen your tree (this is your personal host link, so keep it to yourself):\n${link}\n\nWhat to do next:\n1. Name your party and pick a date, or let your guests vote on one.\n2. Add your guests and send their invitations.\n3. On the day, start a Google Meet in your own Google account and paste its link into your party.\n\nRefunds: a full refund within 14 days of purchase, as long as the presents have not been opened.\n\nKeep this email. It is the way back to your tree.`,
          html: `<div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#2a1a12;max-width:560px;margin:0 auto">
<p style="font-size:20px"><strong>Thank you! Your Christmas tree is ready.</strong></p>
<p style="margin:26px 0"><a href="${link}" style="display:inline-block;background:#b3152d;color:#fff;text-decoration:none;padding:16px 28px;border-radius:12px;font-weight:700;font-size:18px">Open my tree</a></p>
<p style="font-size:15px;color:#5a4a3a">This is your personal host link, so keep it to yourself. Keep this email: it is the way back to your tree.</p>
<ol style="font-size:16px;line-height:1.6"><li>Name your party and pick a date, or let your guests vote on one.</li><li>Add your guests and send their invitations.</li><li>On the day, start a Google Meet in your own Google account and paste its link into your party.</li></ol>
<p style="font-size:13px;color:#8a7a6a">Refunds: a full refund within 14 days of purchase, as long as the presents have not been opened.</p></div>`,
        })).catch(() => {});
      }
      return "created";
    }

    if (event.type === "charge.refunded") {
      const c = event.data.object as Charge;
      if (!c.payment_intent) return "ignored";
      const full = (c.amount_refunded ?? 0) >= (c.amount ?? Infinity);
      const [order] = await tx`
        update orders set refunded_amount = ${c.amount_refunded ?? 0}, status = ${full ? "refunded" : "partially_refunded"}
        where stripe_payment_intent = ${c.payment_intent} returning party_id`;
      if (!order) return "ignored";
      if (full && order.party_id) {
        await tx`
          update parties set cancelled_at = coalesce(cancelled_at, now()),
            expires_at = least(expires_at, now() + make_interval(days => ${REFUND_GRACE_DAYS}))
          where id = ${order.party_id}`;
      }
      return "refunded";
    }
    return "ignored";
  });
}

/**
 * After paying, the buyer lands on the welcome page with their checkout session id.
 * That id (long, random, known only to the buyer) is exchanged for the host's personal link.
 * Returns null until the webhook has created the party.
 */
export async function claimHostToken(sql: Sql, sessionId: string): Promise<string | null> {
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return null;
  const [row] = await sql`
    select g.token_enc from orders o join guests g on g.party_id = o.party_id and g.is_host
    where o.stripe_session_id = ${sessionId}`;
  return row ? decryptToken(row.token_enc) : null;
}
