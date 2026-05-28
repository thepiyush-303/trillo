# Current Database Design

This document describes the database design currently implemented by the migrations in `server/migrations` and the way the API routes use that schema.

## Database Stack

- Database: PostgreSQL.
- Node driver: `pg`, configured through `server/src/db/pool.js`.
- Migration runner: `server/src/db/migrate.js`.
- Migrations run in filename order:
  - `001_initial.sql`
  - `002_inbox_labels.sql`
  - `003_card_inline_labels.sql`
  - `004_archived_cards.sql`
  - `005_card_covers_due_dates_board_background.sql`

## High-Level Model

The app is a Trello-style kanban system with an Inbox.

Main hierarchy:

```text
boards
  -> lists
    -> cards
      -> checklists
        -> checklist_items
```

Supporting relationships:

```text
boards -> labels
cards <-> labels through card_labels
cards <-> members through card_members
cards -> archived_cards
inbox_cards -> cards through converted_card_id
```

Important current implementation detail:

- The database has normalized label tables: `labels` and `card_labels`.
- The newer UI/API also stores inline label arrays in `cards.labels` and `inbox_cards.labels` as `jsonb`.
- This means label data currently exists in two patterns, and future UI/UX work should decide whether board cards should use normalized labels, inline JSON labels, or a migration path from one to the other.

## Entity Relationship Summary

| Entity | Relationship |
| --- | --- |
| `boards` -> `lists` | One board has many lists. `lists.board_id` cascades on board delete. |
| `lists` -> `cards` | One list has many cards. `cards.list_id` cascades on list delete. |
| `boards` -> `labels` | One board has many reusable board labels. `labels.board_id` cascades on board delete. |
| `cards` <-> `labels` | Many-to-many through `card_labels`. |
| `cards` <-> `members` | Many-to-many through `card_members`. |
| `cards` -> `checklists` | One card has many checklists. `checklists.card_id` cascades on card delete. |
| `checklists` -> `checklist_items` | One checklist has many checklist items. |
| `cards` -> `archived_cards` | One archived card has one archive metadata row. |
| `inbox_cards` -> `cards` | Optional conversion link through `inbox_cards.converted_card_id`. |
| `inbox_labels` | Independent Inbox label palette. No foreign key to `inbox_cards`; selections are stored in `inbox_cards.labels`. |

## Tables

### `boards`

Represents a kanban board.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Board id. |
| `title` | `text` | Required, trimmed length > 0 | Board name shown in the UI. |
| `background` | `jsonb` | Nullable | Board background configuration. Added in migration `005`. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Updated manually by routes on edits. |

`background` shape used by the API:

```json
{ "type": "image", "url": "https://...", "position": "center" }
```

```json
{ "type": "color", "value": "#0c66e4" }
```

Relationships:

- Has many `lists`.
- Has many `labels`.
- Has many `archived_cards`.

### `lists`

Represents a column inside a board.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | List id. |
| `board_id` | `bigint` | Required, FK to `boards(id)` with `on delete cascade` | Parent board. |
| `title` | `text` | Required, trimmed length > 0 | List title. |
| `position` | `integer` | Required | Sort order within a board. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Updated manually by routes on edits/reorder. |

Relationships:

- Belongs to one `board`.
- Has many `cards`.
- Can be referenced by `archived_cards.original_list_id`.

Indexes:

- `lists_board_position_idx` on `(board_id, position)`.

### `cards`

Represents a task/card inside a list.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Card id. |
| `list_id` | `bigint` | Required, FK to `lists(id)` with `on delete cascade` | Current list. |
| `title` | `text` | Required, trimmed length > 0 | Card title. |
| `description` | `text` | Required, default `''` | Card details. |
| `position` | `integer` | Required | Sort order within the current list. |
| `due_date` | `date` | Nullable | Due date only, no timezone. |
| `due_time` | `text` | Required, default `''` | UI-formatted due time string. |
| `due_date_completed` | `boolean` | Required, default `false` | Whether the due date is marked complete. |
| `due_date_reminder` | `text` | Required, default `'1 Day before'` | Reminder option label. |
| `due_date_recurring` | `text` | Required, default `'Never'` | Recurrence option label. |
| `cover` | `jsonb` | Nullable | Card cover configuration. |
| `archived` | `boolean` | Required, default `false` | Active cards are queried with `archived = false`. |
| `labels` | `jsonb` | Required, default `[]` | Inline labels used by newer card flows. Added in migration `003`. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Updated manually by routes on edits/reorder/archive. |

`cover` shape used by the API:

```json
{ "type": "image", "url": "https://...", "position": "center", "blur": false }
```

```json
{ "type": "color", "color": "#0c66e4" }
```

`labels` shape currently accepted by API:

```json
["label-ok", "label-red"]
```

or:

```json
[{ "id": "label-ok", "name": "ok", "color": "#1f7a55" }]
```

Relationships:

- Belongs to one `list`.
- Can have many normalized labels through `card_labels`.
- Can have many members through `card_members`.
- Can have many `checklists`.
- Can have one `archived_cards` row when archived.
- Can be referenced by `inbox_cards.converted_card_id`.

Indexes:

- `cards_list_position_idx` on `(list_id, position)`.
- `cards_title_idx` on `(title)`.
- `cards_due_date_idx` on `(due_date)`.
- `cards_archived_idx` on `(archived)`.

### `labels`

Represents reusable board-level labels.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Label id. |
| `board_id` | `bigint` | Required, FK to `boards(id)` with `on delete cascade` | Parent board. |
| `name` | `text` | Required, trimmed length > 0 | Label text. |
| `color` | `text` | Required | Color value used by UI. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Update timestamp. |

Relationships:

- Belongs to one `board`.
- Attached to cards through `card_labels`.
   
Indexes:

- `labels_board_idx` on `(board_id)`.

Current usage:

- Seed data creates labels and assigns a few through `card_labels`.
- `GET /api/boards/:boardId` joins `card_labels` and `labels`, then merges those labels with `cards.labels`.
- There are no current API routes for creating board labels or adding/removing `card_labels`.

### `card_labels`

Join table between board cards and normalized board labels.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `card_id` | `bigint` | Required, FK to `cards(id)` with `on delete cascade` | Card side of the relation. |
| `label_id` | `bigint` | Required, FK to `labels(id)` with `on delete cascade` | Label side of the relation. |

Primary key:

- `(card_id, label_id)`.

Indexes:

- `card_labels_label_idx` on `(label_id)`.

### `members`

Represents seeded workspace members. Authentication is not modeled in the database.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Member id. |
| `name` | `text` | Required, trimmed length > 0 | Display name. |
| `email` | `text` | Required, unique | Email address. |
| `avatar_color` | `text` | Required | UI avatar color. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Update timestamp. |

Relationships:

- Attached to cards through `card_members`.

Current usage:

- Seed data creates members.
- `GET /api/boards/:boardId` returns the first five members as board-level avatars.
- Card/member assignment routes are not currently implemented.

### `card_members`

Join table between cards and members.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `card_id` | `bigint` | Required, FK to `cards(id)` with `on delete cascade` | Card side of the relation. |
| `member_id` | `bigint` | Required, FK to `members(id)` with `on delete cascade` | Member side of the relation. |

Primary key:

- `(card_id, member_id)`.

Indexes:

- `card_members_member_idx` on `(member_id)`.

Current usage:

- The table exists, but there are no active API routes using it.

### `checklists`

Represents a checklist attached to a card.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Checklist id. |
| `card_id` | `bigint` | Required, FK to `cards(id)` with `on delete cascade` | Parent card. |
| `title` | `text` | Required, trimmed length > 0 | Checklist title. |
| `position` | `integer` | Required | Sort order within the card. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Update timestamp. |

Relationships:

- Belongs to one `card`.
- Has many `checklist_items`.

Indexes:

- `checklists_card_position_idx` on `(card_id, position)`.

Current usage:

- The table exists, but there are no active API routes using it.

### `checklist_items`

Represents an item inside a checklist.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Checklist item id. |
| `checklist_id` | `bigint` | Required, FK to `checklists(id)` with `on delete cascade` | Parent checklist. |
| `title` | `text` | Required, trimmed length > 0 | Item text. |
| `completed` | `boolean` | Required, default `false` | Completion state. |
| `position` | `integer` | Required | Sort order within the checklist. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Update timestamp. |

Relationships:

- Belongs to one `checklist`.

Indexes:

- `checklist_items_checklist_position_idx` on `(checklist_id, position)`.

Current usage:

- The table exists, but there are no active API routes using it.

### `inbox_cards`

Represents cards captured before they are moved onto a board list.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `bigserial` | Primary key | Inbox card id. |
| `title` | `text` | Required, trimmed length > 0 | Inbox card title. |
| `description` | `text` | Required, default `''` | Inbox card details. |
| `position` | `integer` | Required | Sort order in the Inbox. |
| `converted_card_id` | `bigint` | Nullable, FK to `cards(id)` with `on delete set null` | Set when an Inbox card is converted into a board card. |
| `labels` | `jsonb` | Required, default `[]` | Inline Inbox label selections. Added in migration `002`. |
| `due_date` | `date` | Nullable | Due date. |
| `due_time` | `text` | Required, default `''` | UI-formatted due time string. |
| `due_date_completed` | `boolean` | Required, default `false` | Whether the due date is marked complete. |
| `due_date_reminder` | `text` | Required, default `'1 Day before'` | Reminder option label. |
| `due_date_recurring` | `text` | Required, default `'Never'` | Recurrence option label. |
| `cover` | `jsonb` | Nullable | Inbox card cover configuration. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Updated manually by routes on edits/reorder/convert. |

Relationships:

- Optionally points to a converted board `card`.
- Does not have a join table for labels; selected labels are stored inline in `labels`.

Indexes:

- `inbox_cards_position_idx` on `(position)`.
- `inbox_cards_due_date_idx` on `(due_date)`.

Current usage:

- Active Inbox cards are queried with `converted_card_id is null`.
- Converting an Inbox card inserts a row into `cards`, copies description, labels, due date fields, and cover, then sets `converted_card_id`.
- Moving a board card back to Inbox inserts a new `inbox_cards` row and deletes the board card.

### `inbox_labels`

Represents the editable label palette for Inbox cards.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `id` | `text` | Primary key | Text id generated by the API, such as `label-...`. |
| `name` | `text` | Required, default `''` | Label display name. |
| `color` | `text` | Required, unique | Label color. |
| `position` | `integer` | Required | Sort order in the label picker. |
| `created_at` | `timestamptz` | Required, default `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | Required, default `now()` | Updated manually by routes on rename. |

Indexes:

- `inbox_labels_position_idx` on `(position)`.

Current usage:

- `GET /api/inbox-labels` lists the palette.
- `POST /api/inbox-labels` creates a label with a unique color.
- `PATCH /api/inbox-labels/:labelId` renames a label.
- There is no foreign key from selected Inbox card labels to this table.

### `archived_cards`

Stores archive metadata for cards that have `cards.archived = true`.

| Column | Type | Constraints / Default | Notes |
| --- | --- | --- | --- |
| `card_id` | `bigint` | Primary key, FK to `cards(id)` with `on delete cascade` | Archived card. |
| `board_id` | `bigint` | Required, FK to `boards(id)` with `on delete cascade` | Board used for archive listing. |
| `original_list_id` | `bigint` | Required, FK to `lists(id)` with `on delete cascade` | List to restore into. |
| `original_position` | `integer` | Required | Position to restore to. |
| `archived_at` | `timestamptz` | Required, default `now()` | Archive timestamp. |

Relationships:

- One-to-one with `cards` by primary key.
- Belongs to one `board`.
- References the original `list`.

Indexes:

- `archived_cards_board_archived_at_idx` on `(board_id, archived_at desc)`.
- `archived_cards_original_list_idx` on `(original_list_id)`.

Current usage:

- Archiving inserts or updates this row, then sets `cards.archived = true`.
- Restoring reads this row, sets `cards.archived = false`, restores list and position, then deletes the archive row.
- Listing archived cards joins this table to `cards`.

## Ordering Strategy

The app stores ordering with integer `position` columns.

Used on:

- `lists.position`
- `cards.position`
- `checklists.position`
- `checklist_items.position`
- `inbox_cards.position`
- `inbox_labels.position`

The API generally assigns positions in increments of `1000`:

- First item: `1000`
- Second item: `2000`
- Reorder operations rewrite positions as `(index + 1) * 1000`.

This is simple and works well for current drag-and-drop behavior.

## Delete Behavior

| Delete action | Database result |
| --- | --- |
| Delete board | Deletes its lists, labels, and archive rows through cascading FKs. Lists then delete their cards. |
| Delete list | Deletes its cards through cascade. |
| Delete card | Deletes related `card_labels`, `card_members`, `checklists`, and `archived_cards` through cascade. `inbox_cards.converted_card_id` is set to null if it pointed to that card. |
| Delete label | Deletes related `card_labels` rows, but not cards. |
| Delete member | Deletes related `card_members` rows, but not cards. |
| Delete checklist | Deletes related `checklist_items`. |

## Current API-to-Database Mapping

Board routes:

- `GET /api/boards` reads `boards`.
- `POST /api/boards` inserts into `boards`.
- `GET /api/boards/:boardId` reads `boards`, `lists`, active `cards`, normalized `card_labels`/`labels`, and first five `members`.
- `PATCH /api/boards/:boardId` updates `boards.title`.
- `PATCH /api/boards/:boardId/background` updates `boards.background`.
- `POST /api/boards/:boardId/lists` inserts into `lists`.
- `PATCH /api/boards/:boardId/lists/reorder` updates `lists.position`.
- `PATCH /api/lists/:listId` updates `lists.title`.
- `DELETE /api/lists/:listId` deletes a list.
- `POST /api/lists/:listId/cards` inserts into `cards`.
- `PATCH /api/cards/:cardId` updates card title, description, due date fields, and cover.
- `DELETE /api/cards/:cardId` deletes a card.
- `PATCH /api/cards/reorder` updates card `list_id` and `position`.
- `PATCH /api/cards/:cardId/archive` updates `cards.archived` and `archived_cards`.
- `PATCH /api/cards/:cardId/restore` restores from `archived_cards`.
- `GET /api/boards/:boardId/archived-cards` reads `archived_cards` joined with `cards`.
- `POST /api/cards/:cardId/move-to-inbox` inserts into `inbox_cards` and deletes from `cards`.

Inbox routes:

- `GET /api/inbox-cards` reads active `inbox_cards`.
- `POST /api/inbox-cards` inserts into `inbox_cards`.
- `PATCH /api/inbox-cards/reorder` updates `inbox_cards.position`.
- `PATCH /api/inbox-cards/:inboxCardId` updates Inbox card fields.
- `DELETE /api/inbox-cards/:inboxCardId` deletes an active Inbox card.
- `POST /api/inbox-cards/:inboxCardId/convert` inserts into `cards` and updates `inbox_cards.converted_card_id`.
- `GET /api/inbox-labels` reads `inbox_labels`.
- `POST /api/inbox-labels` inserts into `inbox_labels`.
- `PATCH /api/inbox-labels/:labelId` updates `inbox_labels.name`.

## Design Notes For UI/UX Improvements

1. Label modeling needs a decision.
   The database has normalized board labels, but newer flows use `jsonb` inline labels. A redesigned UI with consistent label editing, searching, and filtering will be easier if labels have one canonical model.

2. Members are only partially implemented.
   `members` and `card_members` exist, but card assignment APIs are not active. If the UI will support assigned members, those endpoints and board payloads should be completed.

3. Checklists are present but unused.
   `checklists` and `checklist_items` exist in the schema, but there are no current routes or board query hydration for them. A card detail redesign can use these tables, but backend support still needs to be added.

4. Due date fields are stored as UI option text.
   `due_time`, `due_date_reminder`, and `due_date_recurring` are text values. This is flexible for UI labels, but it makes validation, localization, reminder scheduling, and recurrence logic harder later.

5. Card covers and board backgrounds are JSON.
   This works for flexible UI settings. If uploads or asset management are added later, a separate asset/media table may be useful.

6. Inbox conversion preserves rich card fields.
   Inbox cards can carry labels, due dates, and covers before conversion. This is good for a capture-first UX.

7. Archive state uses both a boolean and metadata table.
   `cards.archived` controls active visibility, while `archived_cards` stores restore metadata. These two should stay in sync.
<!--
File summary:
- Current database design documentation.
- Explains tables, relationships, and persistence decisions.
- Use this when changing schema or API behavior.
-->
