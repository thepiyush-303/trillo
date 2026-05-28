alter table inbox_cards
  add column if not exists completed boolean not null default false;
-- File summary:
-- - Inbox card completion migration.
-- - Adds persisted completion state to Inbox cards.
-- - Used by Inbox completion toggles and conversion to board cards.
