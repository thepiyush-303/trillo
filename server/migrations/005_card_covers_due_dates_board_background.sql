alter table boards
  add column if not exists background jsonb;

alter table cards
  add column if not exists cover jsonb,
  add column if not exists due_time text not null default '',
  add column if not exists due_date_completed boolean not null default false,
  add column if not exists due_date_reminder text not null default '1 Day before',
  add column if not exists due_date_recurring text not null default 'Never';


alter table inbox_cards
  add column if not exists due_date date,
  add column if not exists due_time text not null default '',
  add column if not exists due_date_completed boolean not null default false,
  add column if not exists due_date_reminder text not null default '1 Day before',
  add column if not exists due_date_recurring text not null default 'Never',
  add column if not exists cover jsonb;

create index if not exists inbox_cards_due_date_idx on inbox_cards(due_date);
