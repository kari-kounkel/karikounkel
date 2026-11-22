// Creates one party in the database named by DATABASE_URL and prints the host's link secret.
// Local/dev use: `npx tsx scripts/seed-party.mts "Host Name"`.
import postgres from "postgres";
import { createParty } from "../lib/engine";

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const r = await createParty(sql, { hostName: process.argv[2] ?? "Host" });
console.log(r.hostToken);
await sql.end();
