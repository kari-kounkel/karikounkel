import postgres from "postgres";

let client: postgres.Sql | undefined;
let chosen: Promise<postgres.Sql> | undefined;

const open = (url: string) => postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 6, onnotice: () => {} });

/**
 * One pooled client per server instance. `prepare: false` is required by Supabase's transaction pooler.
 * Supabase serves a project's pooler from one of two hostnames (aws-0-… or aws-1-…) and does not say
 * which over its API, so `ready()` tries the configured one and, if it cannot connect, the other.
 */
export function db(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = open(url);
  }
  return client;
}

export function ready(): Promise<postgres.Sql> {
  chosen ??= (async () => {
    const first = db();
    try {
      await first`select 1`;
      return first;
    } catch (err) {
      const url = process.env.DATABASE_URL!;
      const alt = url.includes("@aws-0-") ? url.replace("@aws-0-", "@aws-1-") : url.includes("@aws-1-") ? url.replace("@aws-1-", "@aws-0-") : null;
      if (!alt) throw err;
      const second = open(alt);
      await second`select 1`;
      await first.end({ timeout: 1 }).catch(() => {});
      client = second;
      return second;
    }
  })();
  chosen.catch(() => { chosen = undefined; }); // a failed attempt must not be remembered
  return chosen;
}
