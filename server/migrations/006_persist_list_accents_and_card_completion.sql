alter table lists
  add column if not exists accent text;

alter table cards
  add column if not exists completed boolean not null default false;
