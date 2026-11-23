-- Guests can bring someone (a spouse, a sibling). We remember who invited whom.
alter table guests add column invited_by uuid references guests(id) on delete set null;
