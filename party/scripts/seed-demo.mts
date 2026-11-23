// Local/dev only: builds a party of N people where everyone has wrapped a present for everyone
// (except the host's present to "Grandma June", left for a human to make). Prints the host's and June's link secrets.
import postgres from "postgres";
import * as e from "../lib/engine";

const n = Number(process.argv[2] ?? 7);
const NAMES = ["Grandma June", "Uncle Pete", "Aunt Rosa", "Cousin Theo", "Papa Lou", "Mira", "Finnegan", "Dolores", "Sam", "Ines", "Walt", "Beatrix",
  "Hank", "Odette", "Jonah", "Priya", "Gus", "Marisol", "Teddy", "Wren", "Otis", "Calla", "Ravi", "Nell"];
const PAPERS = ["red", "snow", "green", "plaid", "gold", "stars", "candy", "kraft"];
const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {}, max: 10 });

const { hostToken } = await e.createParty(sql, { hostName: "Kari", name: "The Kounkel Family Christmas" });
const host = await e.sessionFromToken(sql, hostToken);
await e.updateParty(sql, host, { party_at: new Date("2026-12-24T18:30:00-06:00"), meet_url: "https://meet.google.com/abc-defg-hij" });
const tokens = [hostToken];
for (const name of NAMES.slice(0, n - 1)) tokens.push((await e.addGuest(sql, host, { name })).token);
const people = await Promise.all(tokens.map((t) => e.sessionFromToken(sql, t)));
let k = 0;
await Promise.all(people.flatMap((giver) => people.map(async (rcpt) => {
  if (giver === rcpt || (giver.guest.is_host && rcpt.guest.name === "Grandma June")) return;
  const id = await e.createGift(sql, giver, rcpt.guest.id, { wrap: PAPERS[k++ % PAPERS.length], title: `From ${giver.guest.name}`, message: `Merry Christmas, ${rcpt.guest.name}!` });
  await e.wrapGift(sql, giver, id);
})));
console.log(JSON.stringify({ host: hostToken, june: tokens[1] }));
await sql.end();
