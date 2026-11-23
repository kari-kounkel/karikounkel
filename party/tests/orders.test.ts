import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import * as e from "@/lib/engine";
import { PRODUCT_TAG, claimHostToken, handleStripeEvent } from "@/lib/orders";
import { POST } from "@/app/api/stripe/webhook/route";
import { connect, resetDb } from "./helpers";

const sql = connect();
beforeAll(() => resetDb(sql));
afterAll(() => sql.end());

let n = 0;
const paid = (over: Record<string, unknown> = {}) => {
  const k = ++n;
  return {
    id: `evt_${k}`, type: "checkout.session.completed",
    data: { object: { id: `cs_test_${"a".repeat(20)}${k}`, payment_status: "paid", amount_total: 4900, currency: "usd", payment_intent: `pi_${k}`,
      client_reference_id: "ref-grandma-blog", customer_details: { email: "buyer@example.com", name: "June Carter" }, metadata: { product: PRODUCT_TAG }, ...over } },
  };
};
const count = async (t: string) => (await sql.unsafe(`select count(*)::int as n from ${t}`))[0].n as number;

describe("payment to party", () => {
  it("creates exactly one party, with a working host link, from a paid checkout", async () => {
    const ev = paid();
    const sessionId = (ev.data.object as { id: string }).id;
    expect(await claimHostToken(sql, sessionId)).toBeNull(); // nothing before payment
    expect(await handleStripeEvent(sql, ev)).toBe("created");
    const token = await claimHostToken(sql, sessionId);
    const host = await e.sessionFromToken(sql, token);
    expect(host.guest).toMatchObject({ is_host: true, name: "June", email: "buyer@example.com" });
    const [order] = await sql`select amount_total, ref_code, status from orders where stripe_session_id = ${sessionId}`;
    expect(order).toMatchObject({ amount_total: 4900, ref_code: "ref-grandma-blog", status: "paid" });
  });

  it("does not create a second party when Stripe delivers the same event again, even at the same instant", async () => {
    const ev = paid();
    const before = await count("parties");
    const results = await Promise.all(Array.from({ length: 8 }, () => handleStripeEvent(sql, ev)));
    expect(results.filter((r) => r === "created")).toHaveLength(1);
    expect(results.filter((r) => r === "duplicate")).toHaveLength(7);
    expect(await count("parties")).toBe(before + 1);
  });

  it("does not create a second party when two different events announce the same paid session", async () => {
    const first = paid();
    const second = { ...first, id: "evt_other", type: "checkout.session.async_payment_succeeded" };
    const before = await count("parties");
    expect(await handleStripeEvent(sql, first)).toBe("created");
    expect(await handleStripeEvent(sql, second)).toBe("duplicate");
    expect(await count("parties")).toBe(before + 1);
  });

  it("waits for money: an unpaid session creates nothing, and its later success does", async () => {
    const pending = paid({ payment_status: "unpaid" });
    const before = await count("parties");
    expect(await handleStripeEvent(sql, pending)).toBe("awaiting_payment");
    expect(await count("parties")).toBe(before);
    const later = { id: "evt_later", type: "checkout.session.async_payment_succeeded", data: { object: { ...(pending.data.object as object), payment_status: "paid" } } };
    expect(await handleStripeEvent(sql, later)).toBe("created");
  });

  it("ignores checkouts for other products sold from the same Stripe account", async () => {
    const before = await count("parties");
    expect(await handleStripeEvent(sql, paid({ metadata: { product: "court-of-accounts" } }))).toBe("ignored");
    expect(await handleStripeEvent(sql, paid({ metadata: null }))).toBe("ignored");
    expect(await count("parties")).toBe(before);
  });

  it("accepts a fully discounted test order", async () => {
    expect(await handleStripeEvent(sql, paid({ payment_status: "no_payment_required", amount_total: 0, payment_intent: null }))).toBe("created");
  });

  it("on a full refund, cancels the party and deletes it a week later; a partial refund leaves it alone", async () => {
    const ev = paid();
    const s = ev.data.object as { id: string; payment_intent: string };
    await handleStripeEvent(sql, ev);
    const [{ party_id }] = await sql`select party_id from orders where stripe_session_id = ${s.id}`;

    expect(await handleStripeEvent(sql, { id: "evt_r1", type: "charge.refunded", data: { object: { payment_intent: s.payment_intent, amount: 4900, amount_refunded: 1000 } } })).toBe("refunded");
    let [p] = await sql`select cancelled_at from parties where id = ${party_id}`;
    expect(p.cancelled_at).toBeNull();

    await handleStripeEvent(sql, { id: "evt_r2", type: "charge.refunded", data: { object: { payment_intent: s.payment_intent, amount: 4900, amount_refunded: 4900 } } });
    [p] = await sql`select cancelled_at, expires_at from parties where id = ${party_id}`;
    expect(p.cancelled_at).not.toBeNull();
    const days = (new Date(p.expires_at).getTime() - Date.now()) / 86400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
    const [o] = await sql`select status, refunded_amount from orders where stripe_session_id = ${s.id}`;
    expect(o).toMatchObject({ status: "refunded", refunded_amount: 4900 });
    expect(await handleStripeEvent(sql, { id: "evt_r3", type: "charge.refunded", data: { object: { payment_intent: "pi_unknown", amount: 1, amount_refunded: 1 } } })).toBe("ignored");
  });

  it("rejects malformed session ids at the claim step", async () => {
    expect(await claimHostToken(sql, "'; drop table orders; --")).toBeNull();
    expect(await claimHostToken(sql, "cs_x")).toBeNull();
  });
});

describe("webhook endpoint", () => {
  const secret = "whsec_test_only";
  const send = (body: string, signature: string | null) =>
    POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers: signature ? { "stripe-signature": signature } : {} }));

  it("refuses unsigned and wrongly signed requests, and accepts a correctly signed one", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const body = JSON.stringify(paid());
    const before = await count("parties");
    expect((await send(body, null)).status).toBe(400);
    expect((await send(body, "t=1,v1=deadbeef")).status).toBe(400);
    const forged = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_someone_elses" });
    expect((await send(body, forged)).status).toBe(400);
    const tampered = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    expect((await send(body.replace("4900", "1"), tampered)).status).toBe(400);
    expect(await count("parties")).toBe(before);

    const good = await send(body, Stripe.webhooks.generateTestHeaderString({ payload: body, secret }));
    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({ outcome: "created" });
    const again = await send(body, Stripe.webhooks.generateTestHeaderString({ payload: body, secret }));
    expect(await again.json()).toMatchObject({ outcome: "duplicate" });
    expect(await count("parties")).toBe(before + 1);
  });
});

describe("receipts and the daily round", () => {
  it("emails the buyer their host link, and a mail failure never undoes a paid party", async () => {
    const outbox: e.Message[] = [];
    const ev = paid();
    expect(await handleStripeEvent(sql, ev, async (_s, m) => { outbox.push(m); })).toBe("created");
    const token = await claimHostToken(sql, (ev.data.object as { id: string }).id);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ channel: "email", to: "buyer@example.com", type: "party_purchase" });
    expect(outbox[0].body).toContain(`#t=${token}`);

    const broken = paid();
    expect(await handleStripeEvent(sql, broken, async () => { throw new Error("mail is down"); })).toBe("created");
    expect(await claimHostToken(sql, (broken.data.object as { id: string }).id)).not.toBeNull();
  });

  it("warns guests with an email a week and a day before deletion, once each", async () => {
    await sql`update parties set expires_at = now() + interval '10 years'`;
    const { partyId, hostToken } = await e.createParty(sql, { hostName: "Host", hostEmail: "host@example.com" });
    const host = await e.sessionFromToken(sql, hostToken);
    await e.addGuest(sql, host, { name: "June", contact: "june@example.com" });
    await e.addGuest(sql, host, { name: "No Email" });
    const outbox: e.Message[] = [];
    const collect: e.Messenger = async (_s, m) => { outbox.push(m); };

    await sql`update parties set expires_at = now() + interval '20 days' where id = ${partyId}`;
    expect(await e.sendExpiryReminders(sql, collect)).toBe(0);
    await sql`update parties set expires_at = now() + interval '6 days' where id = ${partyId}`;
    expect(await e.sendExpiryReminders(sql, collect)).toBe(2);       // host and June; not the guest without an email
    expect(await e.sendExpiryReminders(sql, collect)).toBe(0);       // not again
    expect(outbox.map((m) => m.to).sort()).toEqual(["host@example.com", "june@example.com"]);
    expect(outbox[0].subject).toContain("in one week");
    await sql`update parties set expires_at = now() + interval '20 hours' where id = ${partyId}`;
    expect(await e.sendExpiryReminders(sql, collect)).toBe(2);
    expect(outbox[2].subject).toContain("tomorrow");
    expect(await e.sendExpiryReminders(sql, collect)).toBe(0);
  });
});

describe("party size", () => {
  it("gives a purchase the size it paid for, and the server holds that line", async () => {
    const big = paid({ metadata: { product: PRODUCT_TAG, capacity: "50" } });
    await handleStripeEvent(sql, big, async () => {});
    const host = await e.sessionFromToken(sql, await claimHostToken(sql, (big.data.object as { id: string }).id));
    expect(host.party.max_guests).toBe(50);
    for (let i = 1; i < 50; i++) await e.addGuest(sql, host, { name: `G${i}` });
    await expect(e.addGuest(sql, host, { name: "Fifty-one" })).rejects.toThrow(/up to 50/);

    // Nonsense or tampered sizes fall back to the standard party.
    const odd = paid({ metadata: { product: PRODUCT_TAG, capacity: "100000" } });
    await handleStripeEvent(sql, odd, async () => {});
    const h2 = await e.sessionFromToken(sql, await claimHostToken(sql, (odd.data.object as { id: string }).id));
    expect(h2.party.max_guests).toBe(25);
  });
});
