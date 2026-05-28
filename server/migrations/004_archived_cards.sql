create table if not exists archived_cards (
  card_id bigint primary key references cards(id) on delete cascade,
  board_id bigint not null references boards(id) on delete cascade,
  original_list_id bigint not null references lists(id) on delete cascade,
  original_position integer not null,
  archived_at timestamptz not null default now()
);

create index if not exists archived_cards_board_archived_at_idx on archived_cards(board_id, archived_at desc);
create index if not exists archived_cards_original_list_idx on archived_cards(original_list_id);

insert into archived_cards (card_id, board_id, original_list_id, original_position, archived_at)
select cards.id, lists.board_id, cards.list_id, cards.position, cards.updated_at
from cards
join lists on lists.id = cards.list_id
where cards.archived = true
on conflict (card_id) do nothing;
-- File summary:
-- - Archived cards schema migration.
-- - Creates durable archive records for board cards.
-- - Used by archive, restore, and archived-card listing flows.
