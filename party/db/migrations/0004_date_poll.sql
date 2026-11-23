-- "When should we celebrate?" The host proposes up to three dates; guests tick the ones they can make.
create table date_options (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references parties(id) on delete cascade,
  starts_at  timestamptz not null,
  created_at timestamptz not null default now(),
  unique (party_id, starts_at)
);
create table date_votes (
  option_id uuid not null references date_options(id) on delete cascade,
  guest_id  uuid not null references guests(id) on delete cascade,
  primary key (option_id, guest_id)
);
alter table date_options enable row level security;
alter table date_votes enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table date_options, date_votes from anon, authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'party_app') then
    grant select, insert, update, delete on table date_options, date_votes to party_app;
    create policy app_server on date_options for all to party_app using (true) with check (true);
    create policy app_server on date_votes for all to party_app using (true) with check (true);
  end if;
end $$;
