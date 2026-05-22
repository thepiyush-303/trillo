alter table cards
  add column if not exists labels jsonb not null default '[]'::jsonb;
