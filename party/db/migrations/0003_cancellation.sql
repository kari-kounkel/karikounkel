-- A refunded party is cancelled: it becomes read-only and is deleted a week later,
-- so guests can still retrieve what they put in.
alter table parties add column cancelled_at timestamptz;
