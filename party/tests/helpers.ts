import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { addGuest, createParty, sessionFromToken, type Session } from "@/lib/engine";

export function connect() {
  return postgres(process.env.TEST_DATABASE_URL!, { onnotice: () => {}, max: 10 });
}

/** Wipes the test database and applies every migration, in order. */
export async function resetDb(sql: postgres.Sql) {
  await sql.unsafe("drop schema public cascade; create schema public;");
  const dir = path.resolve(__dirname, "../db/migrations");
  for (const f of readdirSync(dir).sort()) await sql.unsafe(readFileSync(path.join(dir, f), "utf8"));
}

/** A party with a host plus `extra` guests; returns a session for each, host first. */
export async function makeParty(sql: postgres.Sql, extra: number, mode?: "everyone" | "secret_santa" | "open") {
  const { partyId, hostToken } = await createParty(sql, { hostName: "Host" });
  if (mode) await sql`update parties set exchange_mode = ${mode} where id = ${partyId}`;
  const host = await sessionFromToken(sql, hostToken);
  const sessions: Session[] = [host];
  const tokens: string[] = [hostToken];
  for (let i = 1; i <= extra; i++) {
    const { token } = await addGuest(sql, host, { name: `Guest ${i}` });
    tokens.push(token);
    sessions.push(await sessionFromToken(sql, token));
  }
  return { partyId, sessions, tokens, host };
}

/** Re-reads a session so it reflects the party's current state. */
export const fresh = (sql: postgres.Sql, token: string) => sessionFromToken(sql, token);
