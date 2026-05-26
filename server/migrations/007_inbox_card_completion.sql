alter table inbox_cards
  add column if not exists completed boolean not null default false;
