import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as e from "@/lib/engine";
import { drawCycle, decryptToken, encryptToken, hashToken, newToken } from "@/lib/secrets";
import { connect, fresh, makeParty, resetDb } from "./helpers";

const sql = connect();
beforeAll(() => resetDb(sql));
afterAll(() => sql.end());

const code = (p: Promise<unknown>) => p.then(() => "ok", (err) => (err instanceof e.AppError ? err.code : `threw:${err}`));

describe("secrets", () => {
  it("draws one cycle: nobody gets themselves, nobody swaps, everyone gives and receives once", () => {
    for (let n = 3; n <= 25; n++) {
      for (let round = 0; round < 200; round++) {
        const ids = Array.from({ length: n }, (_, i) => i);
        const pairs = drawCycle(ids);
        const to = new Map(pairs);
        expect(new Set(to.values()).size).toBe(n);
        for (const [g, r] of pairs) {
          expect(r).not.toBe(g);
          expect(to.get(r)).not.toBe(g);
        }
        let at = 0, steps = 0;
        do { at = to.get(at)!; steps++; } while (at !== 0);
        expect(steps).toBe(n);
      }
    }
  });
  it("refuses a draw of two", () => expect(() => drawCycle([1, 2])).toThrow());
  it("round-trips an encrypted token and never stores it in the clear", () => {
    const t = newToken();
    const enc = encryptToken(t);
    expect(enc).not.toContain(t);
    expect(decryptToken(enc)).toBe(t);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("invitations", () => {
  it("rejects missing, malformed and unknown links", async () => {
    expect(await code(e.sessionFromToken(sql, null))).toBe("no_token");
    expect(await code(e.sessionFromToken(sql, "short"))).toBe("no_token");
    expect(await code(e.sessionFromToken(sql, newToken()))).toBe("bad_token");
  });
  it("lets a returning guest back in with the same link", async () => {
    const { tokens } = await makeParty(sql, 1);
    const a = await e.sessionFromToken(sql, tokens[1]);
    const b = await e.sessionFromToken(sql, tokens[1]);
    expect(a.guest.id).toBe(b.guest.id);
  });
  it("only the host manages guests, and a party stops at 25", async () => {
    const { sessions, host } = await makeParty(sql, 24);
    expect(sessions).toHaveLength(25);
    expect(await code(e.addGuest(sql, host, { name: "Twenty-six" }))).toBe("invalid");
    expect(await code(e.addGuest(sql, sessions[1], { name: "Sneak" }))).toBe("forbidden");
    expect(await code(e.listGuestLinks(sql, sessions[1]))).toBe("forbidden");
    const links = await e.listGuestLinks(sql, host);
    expect(links).toHaveLength(25);
    expect((await e.sessionFromToken(sql, links[3].token)).guest.id).toBe(links[3].id);
  });
  it("holds the 25 limit when invitations race", async () => {
    const { host, partyId } = await makeParty(sql, 20);
    await Promise.allSettled(Array.from({ length: 12 }, (_, i) => e.addGuest(sql, host, { name: `Racer ${i}` })));
    const [{ n }] = await sql`select count(*)::int as n from guests where party_id = ${partyId}`;
    expect(n).toBe(25);
  });
});

describe("gift privacy", () => {
  it("keeps wrapped contents from everyone but the giver until the host opens", async () => {
    const { sessions, tokens } = await makeParty(sql, 2);
    const [host, ann, bob] = sessions;
    const id = await e.createGift(sql, ann, bob.guest.id, { message: "The secret message", title: "For Bob" });
    await e.wrapGift(sql, ann, id);

    expect((await e.getGift(sql, ann, id)).message).toBe("The secret message");
    expect(await code(e.getGift(sql, bob, id))).toBe("not_found");
    expect(await code(e.getGift(sql, host, id))).toBe("not_found");
    expect(await e.myReceivedGifts(sql, bob)).toEqual([]);
    expect(await code(e.listThanks(sql, bob, id))).toBe("not_found");

    const tree = await e.treeView(sql, bob);
    expect(tree.presents).toHaveLength(1);
    expect(JSON.stringify(tree)).not.toContain("secret message");
    expect(JSON.stringify(tree)).not.toContain("For Bob");

    expect(await code(e.openParty(sql, bob))).toBe("forbidden");
    await e.openParty(sql, host);
    expect(await code(e.openParty(sql, host))).toBe("invalid");

    const bobNow = await fresh(sql, tokens[2]);
    expect((await e.getGift(sql, bobNow, id)).message).toBe("The secret message");
    expect(await e.myReceivedGifts(sql, bobNow)).toHaveLength(1);
    expect(await code(e.getGift(sql, await fresh(sql, tokens[0]), id))).toBe("not_found"); // host is still not a party to it
  });

  it("never reveals a draft, even after opening", async () => {
    const { sessions, tokens } = await makeParty(sql, 1);
    const [host, ann] = sessions;
    const id = await e.createGift(sql, ann, host.guest.id, { message: "half-written" });
    await e.openParty(sql, host);
    const hostNow = await fresh(sql, tokens[0]);
    expect(await e.myReceivedGifts(sql, hostNow)).toEqual([]);
    expect(await code(e.getGift(sql, hostNow, id))).toBe("not_found");
    expect((await e.treeView(sql, hostNow)).presents).toEqual([]);
  });

  it("refuses to wrap an empty box, and recovers a draft exactly as saved", async () => {
    const { sessions } = await makeParty(sql, 1);
    const [host, ann] = sessions;
    const id = await e.createGift(sql, ann, host.guest.id);
    expect(await code(e.wrapGift(sql, ann, id))).toBe("invalid");
    await e.saveGift(sql, ann, id, { message: "Dear host," });
    await e.saveGift(sql, ann, id, { wrap: "plaid", links: [{ kind: "youtube", url: "https://youtu.be/abc", label: "Our song" }] });
    const [draft] = await e.myGivenGifts(sql, ann);
    expect(draft).toMatchObject({ status: "draft", message: "Dear host,", wrap: "plaid" });
    expect(draft.links).toHaveLength(1);
    await e.wrapGift(sql, ann, id);
  });

  it("validates links", async () => {
    const { sessions } = await makeParty(sql, 1);
    const [host, ann] = sessions;
    const id = await e.createGift(sql, ann, host.guest.id);
    const save = (links: unknown) => e.saveGift(sql, ann, id, { links }).then(() => "ok", () => "rejected");
    expect(await save([{ kind: "other", url: "javascript:alert(1)" }])).toBe("rejected");
    expect(await save([{ kind: "other", url: "http://plain.example.com" }])).toBe("rejected");
    expect(await save([{ kind: "youtube", url: "https://evil.example.com/watch" }])).toBe("rejected");
    expect(await save([{ kind: "purchase", url: "https://www.example.com/item" }])).toBe("ok");
    expect(await save(Array(6).fill({ kind: "other", url: "https://example.com" }))).toBe("rejected");
  });

  it("locks an opened gift against edits, but only the giver could ever touch it", async () => {
    const { sessions, tokens } = await makeParty(sql, 2);
    const [host, ann, bob] = sessions;
    const id = await e.createGift(sql, ann, bob.guest.id, { message: "hi" });
    expect(await code(e.saveGift(sql, bob, id, { message: "hijack" }))).toBe("not_found");
    expect(await code(e.wrapGift(sql, bob, id))).toBe("not_found");
    expect(await code(e.deleteGift(sql, host, id))).toBe("not_found");
    await e.wrapGift(sql, ann, id);
    await e.openParty(sql, host);
    const annNow = await fresh(sql, tokens[1]);
    expect(await code(e.saveGift(sql, annNow, id, { message: "rewrite" }))).toBe("invalid");
    expect(await code(e.unwrapGift(sql, annNow, id))).toBe("invalid");
    expect(await code(e.deleteGift(sql, annNow, id))).toBe("invalid");
  });
});

describe("cross-party isolation", () => {
  it("a guest of one party can touch nothing in another", async () => {
    const a = await makeParty(sql, 2);
    const b = await makeParty(sql, 2);
    const [, annA, bobA] = a.sessions;
    const [hostB, annB, bobB] = b.sessions;
    const giftB = await e.createGift(sql, annB, bobB.guest.id, { message: "party B only" });
    await e.wrapGift(sql, annB, giftB);
    await e.openParty(sql, hostB);

    expect(await code(e.createGift(sql, annA, bobB.guest.id))).toBe("not_found");
    expect(await code(e.getGift(sql, annA, giftB))).toBe("not_found");
    expect(await code(e.saveGift(sql, annA, giftB, { message: "x" }))).toBe("not_found");
    expect(await code(e.postThanks(sql, bobA, giftB, { body: "x" }))).toBe("not_found");
    expect(await code(e.listThanks(sql, bobA, giftB))).toBe("not_found");
    expect(await code(e.removeGuest(sql, a.host, bobB.guest.id))).toBe("not_found");
    expect(await code(e.reservePhoto(sql, annA, giftB, { mime: "image/png", sizeBytes: 10 }))).toBe("not_found");
    const treeA = await e.treeView(sql, annA);
    expect(treeA.presents).toEqual([]);
    expect(treeA.guests.map((g) => g.id)).not.toContain(bobB.guest.id);
  });
});

describe("exchange formats", () => {
  it("everyone-gives-to-everyone: one gift per pair, none to yourself", async () => {
    const { sessions } = await makeParty(sql, 2, "everyone");
    const [host, ann] = sessions;
    await e.createGift(sql, ann, host.guest.id);
    expect(await code(e.createGift(sql, ann, host.guest.id))).toBe("invalid");
    expect(await code(e.createGift(sql, ann, ann.guest.id))).toBe("invalid");
  });

  it("open gifting: choose anyone, up to three per person", async () => {
    const { sessions } = await makeParty(sql, 2, "open");
    const [host, ann] = sessions;
    for (let i = 0; i < 3; i++) await e.createGift(sql, ann, host.guest.id);
    expect(await code(e.createGift(sql, ann, host.guest.id))).toBe("invalid");
  });

  it("secret santa: private assignments, gifts only to the person you drew", async () => {
    const { sessions, tokens, host, partyId } = await makeParty(sql, 5, "secret_santa");
    expect(await code(e.createGift(sql, sessions[1], sessions[2].guest.id))).toBe("invalid"); // not drawn yet
    expect(await code(e.drawNames(sql, sessions[1]))).toBe("forbidden");
    await e.drawNames(sql, host);
    expect(await code(e.drawNames(sql, await fresh(sql, tokens[0])))).toBe("invalid");
    expect(await code(e.addGuest(sql, await fresh(sql, tokens[0]), { name: "Late" }))).toBe("invalid");

    const live = await Promise.all(tokens.map((t) => fresh(sql, t)));
    const drawn = await Promise.all(live.map((s) => e.myAssignment(sql, s)));
    expect(new Set(drawn.map((d) => d!.id)).size).toBe(6);
    live.forEach((s, i) => expect(drawn[i]!.id).not.toBe(s.guest.id));

    const giver = live[1];
    const target = drawn[1]!.id;
    const wrong = live.find((s) => s.guest.id !== target && s.guest.id !== giver.guest.id)!;
    expect(await code(e.createGift(sql, giver, wrong.guest.id))).toBe("forbidden");
    const id = await e.createGift(sql, giver, target, { message: "from your secret santa" });
    await e.wrapGift(sql, giver, id);

    // Before opening, nobody else can tell who a present is from — the host included.
    for (const s of live.filter((x) => x.guest.id !== giver.guest.id)) {
      const tree = await e.treeView(sql, s);
      expect(tree.presents[0].fromId).toBeNull();
      expect(JSON.stringify(tree)).not.toContain("assign");
    }
    expect((await e.treeView(sql, giver)).presents[0].fromId).toBe(giver.guest.id);

    await e.openParty(sql, live[0]);
    const after = await e.treeView(sql, await fresh(sql, tokens[3]));
    expect(after.presents[0].fromId).toBe(giver.guest.id);
    const [{ n }] = await sql`select count(*)::int as n from assignments where party_id = ${partyId}`;
    expect(n).toBe(6);
  });

  it("will not switch exchange type once gifts exist", async () => {
    const { sessions, host } = await makeParty(sql, 2);
    await e.updateParty(sql, host, { exchange_mode: "open", name: "  Renamed  " });
    await e.createGift(sql, sessions[1], sessions[2].guest.id);
    expect(await code(e.updateParty(sql, host, { exchange_mode: "secret_santa" }))).toBe("invalid");
    expect(await code(e.updateParty(sql, sessions[1], { name: "Mutiny" }))).toBe("forbidden");
  });

  it("accepts only Google Meet links for the call", async () => {
    const { host } = await makeParty(sql, 0);
    await e.updateParty(sql, host, { meet_url: "https://meet.google.com/abc-defg-hij" });
    await expect(e.updateParty(sql, host, { meet_url: "https://zoom.example.com/j/1" })).rejects.toThrow();
  });
});

describe("photos", () => {
  it("enforces three per gift, 5 MB each, images only — on the server", async () => {
    const { sessions } = await makeParty(sql, 1);
    const [host, ann] = sessions;
    const id = await e.createGift(sql, ann, host.guest.id);
    expect(await code(e.reservePhoto(sql, ann, id, { mime: "image/png", sizeBytes: 5 * 1024 * 1024 + 1 }))).toBe("invalid");
    expect(await code(e.reservePhoto(sql, ann, id, { mime: "video/mp4", sizeBytes: 100 }))).toBe("invalid");
    expect(await code(e.reservePhoto(sql, ann, id, { mime: "image/svg+xml", sizeBytes: 100 }))).toBe("invalid");
    expect(await code(e.reservePhoto(sql, host, id, { mime: "image/png", sizeBytes: 100 }))).toBe("not_found");
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => e.reservePhoto(sql, ann, id, { mime: "image/jpeg", sizeBytes: 1000 })),
    );
    const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ id: string; path: string }>[];
    expect(ok).toHaveLength(3);
    // A client that lied about size is caught when the real upload is measured.
    expect(await code(e.confirmPhoto(sql, ann, ok[0].value.id, 6 * 1024 * 1024))).toBe("invalid");
    await e.confirmPhoto(sql, ann, ok[1].value.id, 1000);
    expect((await e.myGivenGifts(sql, ann))[0].photos).toHaveLength(1);
    expect(ok[1].value.path.startsWith(`${ann.party.id}/${id}/`)).toBe(true);
  });
});

describe("thank-yous", () => {
  it("is a private thread between giver and recipient, after opening", async () => {
    const { sessions, tokens } = await makeParty(sql, 2);
    const [host, ann, bob] = sessions;
    const id = await e.createGift(sql, ann, bob.guest.id, { message: "hi" });
    await e.wrapGift(sql, ann, id);
    expect(await code(e.postThanks(sql, bob, id, { body: "early" }))).toBe("not_found");
    await e.openParty(sql, host);
    const [h, a, b] = await Promise.all(tokens.map((t) => fresh(sql, t)));
    await e.postThanks(sql, b, id, { body: "Thank you!", reaction: "❤️" });
    await e.postThanks(sql, a, id, { body: "You are welcome" });
    expect(await e.listThanks(sql, a, id)).toHaveLength(2);
    expect(await code(e.listThanks(sql, h, id))).toBe("not_found");
    expect(await code(e.postThanks(sql, h, id, { body: "butting in" }))).toBe("not_found");
    await expect(e.postThanks(sql, b, id, {})).rejects.toThrow();
    await expect(e.postThanks(sql, b, id, { reaction: "💩" })).rejects.toThrow();
  });
});

describe("expiry", () => {
  it("keeps a party 30 days past its date, then deletes every trace and reports the files to remove", async () => {
    const { sessions, tokens, host, partyId } = await makeParty(sql, 1);
    const other = await makeParty(sql, 1);
    // Parties left behind by earlier tests must not expire inside this test's simulated future.
    await sql`update parties set expires_at = now() + interval '10 years' where id <> ${partyId}`;
    const partyAt = new Date(Date.now() + 5 * 86400_000);
    await e.updateParty(sql, host, { party_at: partyAt });
    const id = await e.createGift(sql, sessions[1], host.guest.id, { message: "x" });
    const ph = await e.reservePhoto(sql, sessions[1], id, { mime: "image/png", sizeBytes: 10 });
    await e.confirmPhoto(sql, sessions[1], ph.id, 10);

    const day = (n: number) => new Date(partyAt.getTime() + n * 86400_000);
    expect((await e.purgeExpired(sql, day(29))).parties).toBe(0);
    await fresh(sql, tokens[1]); // still valid

    const purged = await e.purgeExpired(sql, day(30.01));
    expect(purged.parties).toBe(1);
    expect(purged.paths).toEqual([ph.path]);
    for (const t of ["guests", "gifts", "gift_photos", "gift_messages", "assignments"]) {
      const [{ n }] = await sql.unsafe(`select count(*)::int as n from ${t} where party_id = '${partyId}'`);
      expect(n).toBe(0);
    }
    const [log] = await sql`select guests, gifts, photos from deletion_log where party_id = ${partyId}`;
    expect(log).toMatchObject({ guests: 2, gifts: 1, photos: 1 });
    await fresh(sql, other.tokens[0]); // the neighbouring party is untouched
  });

  it("turns away links to a party past its expiry even before the cleanup job runs", async () => {
    const { tokens, partyId } = await makeParty(sql, 0);
    await sql`update parties set expires_at = now() - interval '1 minute' where id = ${partyId}`;
    expect(await code(e.sessionFromToken(sql, tokens[0]))).toBe("bad_token");
  });
});

describe("rate limiting", () => {
  it("cuts off a burst", async () => {
    const key = `test:${newToken()}`;
    for (let i = 0; i < 5; i++) await e.rateLimit(sql, key, 5, 3600);
    expect(await code(e.rateLimit(sql, key, 5, 3600))).toBe("slow_down");
  });
});
