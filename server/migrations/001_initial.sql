create table if not exists boards (
  id bigserial primary key,
  title text not null check (length(trim(title)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lists (
  id bigserial primary key,
  board_id bigint not null references boards(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cards (
  id bigserial primary key,
  list_id bigint not null references lists(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  position integer not null,
  due_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists labels (
  id bigserial primary key,
  board_id bigint not null references boards(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists card_labels (
  card_id bigint not null references cards(id) on delete cascade,
  label_id bigint not null references labels(id) on delete cascade,
  primary key (card_id, label_id)
);

create table if not exists members (
  id bigserial primary key,
  name text not null check (length(trim(name)) > 0),
  email text not null unique,
  avatar_color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists card_members (
  card_id bigint not null references cards(id) on delete cascade,
  member_id bigint not null references members(id) on delete cascade,
  primary key (card_id, member_id)
);

create table if not exists checklists (
  id bigserial primary key,
  card_id bigint not null references cards(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checklist_items (
  id bigserial primary key,
  checklist_id bigint not null references checklists(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  completed boolean not null default false,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inbox_cards (
  id bigserial primary key,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  position integer not null,
  converted_card_id bigint references cards(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lists_board_position_idx on lists(board_id, position);
create index if not exists cards_list_position_idx on cards(list_id, position);
create index if not exists cards_title_idx on cards(title);
create index if not exists cards_due_date_idx on cards(due_date);
create index if not exists cards_archived_idx on cards(archived);
create index if not exists labels_board_idx on labels(board_id);
create index if not exists card_labels_label_idx on card_labels(label_id);
create index if not exists card_members_member_idx on card_members(member_id);
create index if not exists checklists_card_position_idx on checklists(card_id, position);
create index if not exists checklist_items_checklist_position_idx on checklist_items(checklist_id, position);
create index if not exists inbox_cards_position_idx on inbox_cards(position);
-- File summary:
-- - Initial database schema migration.
-- - Creates boards, lists, cards, labels, checklists, checklist items, and inbox cards.
-- - Foundation migration used by all later schema changes.
