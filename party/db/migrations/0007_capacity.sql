-- Party size is set by what was purchased and enforced by the server. Existing parties keep the standard 25.
alter table parties add column max_guests integer not null default 25 check (max_guests in (25, 50, 100));
