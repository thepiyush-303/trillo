alter table cards
  add column if not exists labels jsonb not null default '[]'::jsonb;
-- File summary:
-- - Card inline labels migration.
-- - Adds JSON label data directly to board cards.
-- - Used to persist card label metadata without only relying on join rows.
