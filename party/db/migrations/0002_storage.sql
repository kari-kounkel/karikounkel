-- Private bucket for gift photos. The bucket itself enforces 5 MB and image types,
-- so the limit holds even if a client bypasses the app. Skipped on plain Postgres (tests).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('gift-photos', 'gift-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
    on conflict (id) do update set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];
  end if;
end $$;
