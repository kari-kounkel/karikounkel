/**
 * Money in, party out. Called only with Stripe events whose signature has already been verified.
 * Everything here is idempotent: Stripe retries deliveries, and a retry must never create a second party.
 */
import type { Sql } from "postgres";
import { createParty } from "./engine";
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

export async function handleStripeEvent(sql: Sql, event: StripeEvent): Promise<Outcome> {
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
      const { partyId } = await createParty(tx as unknown as Sql, { hostName, hostEmail: s.customer_details?.email ?? null });
      await tx`
        insert into orders (stripe_session_id, stripe_payment_intent, email, amount_total, currency, ref_code, party_id)
        values (${s.id}, ${s.payment_intent ?? null}, ${s.customer_details?.email ?? null}, ${s.amount_total ?? 0},
                ${s.currency ?? "usd"}, ${s.client_reference_id?.slice(0, 80) ?? null}, ${partyId})`;
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
