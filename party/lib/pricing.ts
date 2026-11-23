/**
 * What is for sale, in one place. Checkout links are public addresses, not secrets.
 *
 * Only tiers listed in ON_SALE appear on the sales page. Larger parties and party packs are part of
 * the price list but stay off sale until they have been built and load-tested.
 */
export const PRICE_LIST = {
  standard: { dollars: 19, label: "One party, up to 25 guests", capacity: 25 },
  medium: { dollars: 29, label: "One party, 26 to 50 guests", capacity: 50 },
  large: { dollars: 49, label: "One party, 51 to 100 guests", capacity: 100 },
  pack3: { dollars: 49, label: "3-party pack", credits: 3 },
  pack5: { dollars: 79, label: "5-party pack", credits: 5 },
  pack10: { dollars: 149, label: "10-party pack", credits: 10 },
} as const;

export const ON_SALE = {
  standard: { ...PRICE_LIST.standard, url: "https://buy.stripe.com/3cIdR9aZxdlUeLp3Yg18c0l" },
} as const;

/**
 * What a referring creator earns per verified sale of a standard party. Set by the owner.
 * NOT ACTIVE: no referral tracking or payout exists yet, and none starts without the owner's approval.
 */
export const REFERRAL_COMMISSION_DOLLARS = 5;

/** Party sizes the server will accept from a checkout. Anything else falls back to the standard size. */
export const CAPACITIES = [25, 50, 100] as const;
export const STANDARD_CAPACITY = 25;
export function capacityFrom(value: unknown): number {
  const n = Number(value);
  return (CAPACITIES as readonly number[]).includes(n) ? n : STANDARD_CAPACITY;
}
