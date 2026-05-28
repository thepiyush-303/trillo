alter table lists
  add column if not exists accent text;

alter table cards
  add column if not exists completed boolean not null default false;
-- File summary:
-- - List accent and board-card completion migration.
-- - Adds persisted list colors and card completion state.
-- - Used by list styling and board card completion toggles.
