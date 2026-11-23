import postgres from "postgres";

let client: postgres.Sql | undefined;

/** One pooled client per server instance. `prepare: false` is required by Supabase's transaction pooler. */
export function db(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
  }
  return client;
}
