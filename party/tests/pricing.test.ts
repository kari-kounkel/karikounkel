import { describe, expect, it } from "vitest";
import { ON_SALE, PRICE_LIST, capacityFrom } from "@/lib/pricing";

describe("pricing", () => {
  it("matches the owner's price list", () => {
    expect(Object.values(PRICE_LIST).map((p) => p.dollars)).toEqual([19, 29, 49, 49, 79, 149]);
  });
  it("sells only the standard party until larger sizes and packs are ready", () => {
    expect(Object.keys(ON_SALE)).toEqual(["standard"]);
    expect(ON_SALE.standard).toMatchObject({ dollars: 19, capacity: 25 });
  });
  it("accepts only real party sizes from a checkout, and falls back to standard", () => {
    expect([25, "50", 100].map(capacityFrom)).toEqual([25, 50, 100]);
    expect([undefined, "", "9999", -1, "abc", 26].map(capacityFrom)).toEqual([25, 25, 25, 25, 25, 25]);
  });
});
