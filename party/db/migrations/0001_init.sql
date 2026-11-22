-- Party Together — initial schema.
-- Every table has RLS enabled with NO policies: the public (anon) key can read and
-- write nothing. All access goes through the app server, which authorizes each call.

create extension if not exists pgcrypto;

create table parties (
  id            uuid primary key default gen_random_uuid(),
  occasion      text not null default 'christmas',
  name          text not null check (char_length(name) between 1 and 80),
  theme         text not null default 'classic',
  exchange_mode text not null default 'everyone'
                check (exchange_mode in ('everyone', 'secret_santa', 'open')),
  party_at      timestamptz,
  meet_url      text,
  status        text not null default 'active' check (status in ('active', 'opened')),
  drawn_at      timestamptz,          -- Secret Santa names drawn; guest list locks
  opened_at     timestamptz,
  expires_at    timestamptz not null, -- party data is deleted after this
  reminder_7d_at  timestamptz,
  reminder_24h_at timestamptz,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);

create table guests (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references parties(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  email       text,
  is_host     boolean not null default false,
  token_hash  text not null unique,   -- sha256 of the invitation secret
  token_enc   text not null,          -- same secret, encrypted, so the host can re-copy a link
  first_seen_at timestamptz,
  created_at  timestamptz not null default now()
);
create index guests_party_idx on guests(party_id);
create unique index guests_one_host on guests(party_id) where is_host;

create table assignments (
  party_id     uuid not null references parties(id) on delete cascade,
  giver_id     uuid not null references guests(id) on delete cascade,
  recipient_id uuid not null references guests(id) on delete cascade,
  primary key (party_id, giver_id),
  unique (party_id, recipient_id),
  check (giver_id <> recipient_id)
);

create table gifts (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references parties(id) on delete cascade,
  giver_id     uuid not null references guests(id) on delete cascade,
  recipient_id uuid not null references guests(id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft', 'wrapped')),
  wrap         text not null default 'red',
  bow          text not null default 'gold',
  title        text not null default '' check (char_length(title) <= 80),
  message      text not null default '' check (char_length(message) <= 5000),
  coupon       text not null default '' check (char_length(coupon) <= 300),
  links        jsonb not null default '[]'::jsonb,
  wrapped_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (giver_id <> recipient_id)
);
create index gifts_party_idx on gifts(party_id);
create index gifts_giver_idx on gifts(giver_id);
create index gifts_recipient_idx on gifts(recipient_id);

create table gift_photos (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references parties(id) on delete cascade,
  gift_id    uuid not null references gifts(id) on delete cascade,
  path       text not null unique,
  mime       text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  confirmed  boolean not null default false,
  created_at timestamptz not null default now()
);
create index gift_photos_gift_idx on gift_photos(gift_id);

-- Private thank-you thread on one gift, between its giver and its recipient.
create table gift_messages (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references parties(id) on delete cascade,
  gift_id    uuid not null references gifts(id) on delete cascade,
  sender_id  uuid not null references guests(id) on delete cascade,
  body       text not null default '' check (char_length(body) <= 2000),
  reaction   text check (reaction is null or char_length(reaction) <= 16),
  created_at timestamptz not null default now(),
  check (body <> '' or reaction is not null)
);
create index gift_messages_gift_idx on gift_messages(gift_id, created_at);

-- Money. Survives party deletion (party_id goes null) as the financial record.
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  stripe_session_id  text not null unique,
  stripe_payment_intent text,
  email              text,
  amount_total       integer not null,
  currency           text not null default 'usd',
  status             text not null default 'paid' check (status in ('paid', 'refunded', 'partially_refunded')),
  refunded_amount    integer not null default 0,
  fee_amount         integer,
  ref_code           text,
  party_id           uuid references parties(id) on delete set null,
  created_at         timestamptz not null default now()
);

-- Webhook idempotency: one row per Stripe event ever processed.
create table stripe_events (
  event_id    text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (key, window_start)
);

create table support_requests (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid references parties(id) on delete set null,
  email      text,
  body       text not null check (char_length(body) between 1 and 4000),
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create table error_log (
  id         bigint generated always as identity primary key,
  scope      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- Record of what the cleanup job removed (counts only — no personal data).
create table deletion_log (
  id          bigint generated always as identity primary key,
  party_id    uuid not null,
  guests      integer not null,
  gifts       integer not null,
  photos      integer not null,
  deleted_at  timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['parties','guests','assignments','gifts','gift_photos','gift_messages',
                           'orders','stripe_events','rate_limits','support_requests','error_log','deletion_log']
  loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon, authenticated', t);
    end if;
  end loop;
end $$;
