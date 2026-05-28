alter table inbox_cards
  add column if not exists labels jsonb not null default '[]'::jsonb;

create table if not exists inbox_labels (
  id text primary key,
  name text not null default '',
  color text not null unique,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inbox_labels_position_idx on inbox_labels(position);

insert into inbox_labels (id, name, color, position)
values
  ('label-ok', 'ok', '#1f7a55', 1000),
  ('label-gold', '', '#946f00', 2000),
  ('label-orange', '', '#c76300', 3000),
  ('label-red-dark', '', '#7f1d1d', 4000),
  ('label-purple', '', '#7e3fa3', 5000)
on conflict (id) do nothing;
-- File summary:
-- - Inbox labels schema migration.
-- - Adds label storage and card label metadata for Inbox workflows.
-- - Used by Inbox label selection and label persistence.
