/**
 * Prices and their Stripe checkout links, in one place.
 * To end the launch price early or extend it, change PROMO_ENDS. Both links are public addresses, not secrets.
 */
export const PROMO = { dollars: 49, url: "https://buy.stripe.com/28E8wP0kTa9I8n1fGY18c0j" };
export const REGULAR = { dollars: 69, url: "https://buy.stripe.com/dRmeVdebJ5TsfPt9iA18c0k" };
/** The launch price applies until this moment (start of December 1, 2026, US Central). */
export const PROMO_ENDS = "2026-12-01T00:00:00-06:00";

export function currentOffer(now = new Date()) {
  const promo = now < new Date(PROMO_ENDS);
  return { ...(promo ? PROMO : REGULAR), promo, regularDollars: REGULAR.dollars };
}
