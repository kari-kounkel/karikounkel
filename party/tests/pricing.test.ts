import { describe, expect, it } from "vitest";
import { PROMO_ENDS, currentOffer } from "@/lib/pricing";

describe("pricing", () => {
  it("charges the launch price until the promotion ends, then the regular price", () => {
    const end = new Date(PROMO_ENDS).getTime();
    const before = currentOffer(new Date(end - 1000));
    const after = currentOffer(new Date(end + 1000));
    expect(before).toMatchObject({ dollars: 49, promo: true });
    expect(after).toMatchObject({ dollars: 69, promo: false });
    expect(before.url).not.toBe(after.url);
  });
});
