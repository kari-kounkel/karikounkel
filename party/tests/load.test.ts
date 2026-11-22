import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as e from "@/lib/engine";
import { connect, fresh, makeParty, resetDb } from "./helpers";

const sql = connect();
beforeAll(() => resetDb(sql));
afterAll(() => sql.end());

/** 25 people each give to the other 24 = 600 gifts, all written concurrently. */
async function fullParty() {
  const p = await makeParty(sql, 24, "everyone");
  const jobs: Promise<void>[] = [];
  for (const giver of p.sessions) {
    for (const rcpt of p.sessions) {
      if (giver === rcpt) continue;
      jobs.push(
        (async () => {
          const id = await e.createGift(sql, giver, rcpt.guest.id, { message: `From ${giver.guest.name} to ${rcpt.guest.name}` });
          await e.saveGift(sql, giver, id, { wrap: "stars", title: "Merry Christmas" });
          await e.wrapGift(sql, giver, id);
        })(),
      );
    }
  }
  await Promise.all(jobs);
  return p;
}

describe("a full house", () => {
  it("handles 25 guests and 600 gifts, opened for everyone at once", async () => {
    const t0 = Date.now();
    const p = await fullParty();
    const built = Date.now() - t0;

    const t1 = Date.now();
    const tree = await e.treeView(sql, p.sessions[7]);
    const treeMs = Date.now() - t1;
    expect(tree.presents).toHaveLength(600);
    expect(JSON.stringify(tree)).not.toContain("From Guest");

    // Before opening, all 25 see nothing addressed to them.
    for (const s of p.sessions) expect(await e.myReceivedGifts(sql, s)).toEqual([]);

    await e.openParty(sql, p.host);

    // The simultaneous moment: all 25 load their presents at the same instant.
    const t2 = Date.now();
    const live = await Promise.all(p.tokens.map((t) => fresh(sql, t)));
    const received = await Promise.all(live.map((s) => e.myReceivedGifts(sql, s)));
    const openMs = Date.now() - t2;
    received.forEach((gifts, i) => {
      expect(gifts).toHaveLength(24);
      for (const g of gifts) {
        expect(g.recipientId).toBe(live[i].guest.id);
        expect(g.message).toBe(`From ${g.giverName} to ${live[i].guest.name}`);
      }
    });
    console.log(`600 gifts written in ${built} ms · tree view ${treeMs} ms · 25 simultaneous openings ${openMs} ms`);
  });

  it("runs several full parties side by side without a single gift crossing over", async () => {
    const parties = await Promise.all([fullParty(), fullParty(), fullParty()]);
    await Promise.all(parties.map((p) => e.openParty(sql, p.host)));
    for (const p of parties) {
      const ids = new Set(p.sessions.map((s) => s.guest.id));
      const live = await Promise.all(p.tokens.map((t) => fresh(sql, t)));
      const all = (await Promise.all(live.map((s) => e.myReceivedGifts(sql, s)))).flat();
      expect(all).toHaveLength(600);
      for (const g of all) expect(ids.has(g.giverId) && ids.has(g.recipientId)).toBe(true);
    }
    const [{ n }] = await sql`select count(*)::int as n from gifts`;
    expect(n).toBe(2400);
  });
});
