import Stripe from "stripe";
import { db } from "@/lib/db";
import { handleStripeEvent, type StripeEvent } from "@/lib/orders";

// Signature checking needs only the endpoint's signing secret. No Stripe API key is used anywhere in this app.
const stripe = new Stripe("sk_not_used_signature_verification_only");

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: StripeEvent;
  try {
    if (!secret || !signature) throw new Error("missing signature or secret");
    event = (await stripe.webhooks.constructEventAsync(raw, signature, secret)) as unknown as StripeEvent;
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  try {
    const outcome = await handleStripeEvent(db(), event);
    return Response.json({ received: true, outcome });
  } catch (err) {
    console.error("stripe webhook failed:", err instanceof Error ? err.message : "unknown");
    return new Response("Try again", { status: 500 }); // a 500 makes Stripe redeliver; the handler is idempotent
  }
}
