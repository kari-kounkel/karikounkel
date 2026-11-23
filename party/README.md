# Party Together

The app behind `party.karikounkel.com`. Christmas Together (`/christmas`) is the first occasion;
the engine in `lib/engine.ts` is occasion-neutral.

## Layout

| Path | What it is |
|---|---|
| `db/migrations/` | Schema. Every table has RLS on with no policies — only server code reads or writes. |
| `lib/engine.ts` | All the rules: who may see or change what. |
| `lib/secrets.ts` | Invitation secrets and the Secret Santa draw. |
| `lib/storage.ts` | Private photo storage (signed URLs only). |
| `app/api/party/route.ts` | The API: one action per request, invitation secret in the `Authorization` header. |
| `tests/` | Engine tests, including a 25-guest / 600-gift party. |

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Supabase transaction pooler). |
| `INVITE_KEY` | 32 random bytes, base64. Encrypts invitation links at rest. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Photo storage. Server-side only. |

Never commit real values; `.env*` is git-ignored.

## Running the tests

Needs any Postgres 16. Point `TEST_DATABASE_URL` at an empty database (it is wiped on each run):

```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5432/party_test npm test
```
