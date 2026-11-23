-- Invitations by email and text, sent through the existing K Co notification hub (SendGrid + Twilio).
alter table guests add column phone text;
alter table guests add column invited_at timestamptz;
alter table guests add column invite_count integer not null default 0;

-- Where and how to reach the hub. The values are inserted by hand, never committed.
create table hub_config (key text primary key, value text not null);
alter table hub_config enable row level security;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

-- The only door to the hub. The app may call this; it cannot read the hub's key.
create or replace function send_notification(p_channel text, p_to text, p_subject text, p_body text, p_html text default null, p_type text default 'party')
returns bigint language plpgsql security definer set search_path = public, net as $$
declare u text; k text; rid bigint;
begin
  if p_channel not in ('email', 'sms') then raise exception 'channel must be email or sms'; end if;
  select value into u from hub_config where key = 'hub_url';
  select value into k from hub_config where key = 'hub_secret';
  if u is null or k is null then raise exception 'messaging is not configured'; end if;
  select net.http_post(
    url := u,
    body := jsonb_strip_nulls(jsonb_build_object('action', 'notify', 'channel', p_channel, 'type', p_type, 'source', 'party_together',
      'to', p_to, 'subject', p_subject, 'body', p_body, 'html', p_html, 'from_name', 'Christmas Together')),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hub-secret', k)
  ) into rid;
  return rid;
end $$;
revoke all on function send_notification(text, text, text, text, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table hub_config from anon, authenticated;
    revoke all on function send_notification(text, text, text, text, text, text) from anon, authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'party_app') then
    revoke all on table hub_config from party_app;
    grant execute on function send_notification(text, text, text, text, text, text) to party_app;
  end if;
end $$;
