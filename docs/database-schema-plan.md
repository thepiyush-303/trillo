# Database Schema Design Plan

## Summary

Design the database in layers: start with the core Trello hierarchy, then add ordering, then card details, then search/filter support. Keep the schema normalized so boards, lists, cards, labels, members, and checklists can evolve independently.

## Step 1: Define Core Entities

Start with the three required project-management entities.

### Boards

Represents one Kanban board.

Minimum fields:

- `id`
- `title`
- `created_at`
- `updated_at`

### Lists

Represents columns inside a board, like `To Do`, `Doing`, and `Done`.

Minimum fields:

- `id`
- `board_id`
- `title`
- `position`
- `created_at`
- `updated_at`

### Cards

Represents tasks inside lists.

Minimum fields:

- `id`
- `list_id`
- `title`
- `description`
- `position`
- `archived`
- `due_date`
- `created_at`
- `updated_at`

Relationships:

- One board has many lists.
- One list has many cards.

## Step 2: Add Ordering Support

Drag-and-drop requires persistent ordering.

Use a `position` column on:

- `lists`
- `cards`
- later, `checklists`
- later, `checklist_items`

Recommended type: `integer` or `numeric`.

For the first version, `integer` is simpler:

- First list position: `1000`
- Next list position: `2000`

This leaves room for inserting between items later.

## Step 3: Add Labels

Labels are reusable per board, and many cards can use many labels.

Tables:

- `labels`
  - `id`
  - `board_id`
  - `name`
  - `color`
  - timestamps
- `card_labels`
  - `card_id`
  - `label_id`

Relationships:

- One board has many labels.
- One card can have many labels.
- One label can be attached to many cards.

Add a unique constraint on:

- `card_labels(card_id, label_id)`

## Step 4: Add Members

Since auth is not part of the first version, create seeded workspace members.

Tables:

- `members`
  - `id`
  - `name`
  - `email`
  - `avatar_color`
  - timestamps
- `card_members`
  - `card_id`
  - `member_id`

Relationships:

- One card can have many members.
- One member can be assigned to many cards.

Add a unique constraint on:

- `card_members(card_id, member_id)`

## Step 5: Add Checklists

Checklists belong to cards. Checklist items belong to checklists.

Tables:

- `checklists`
  - `id`
  - `card_id`
  - `title`
  - `position`
  - timestamps
- `checklist_items`
  - `id`
  - `checklist_id`
  - `title`
  - `completed`
  - `position`
  - timestamps

Relationships:

- One card has many checklists.
- One checklist has many checklist items.

## Step 6: Add Constraints

Use constraints to keep the data valid.

Recommended constraints:

- `boards.title` should not be empty.
- `lists.board_id` references `boards.id`.
- `cards.list_id` references `lists.id`.
- `labels.board_id` references `boards.id`.
- `card_labels.card_id` references `cards.id`.
- `card_labels.label_id` references `labels.id`.
- `card_members.card_id` references `cards.id`.
- `card_members.member_id` references `members.id`.
- `checklists.card_id` references `cards.id`.
- `checklist_items.checklist_id` references `checklists.id`.

Recommended delete behavior:

- Deleting a board deletes its lists, cards, labels, and related join records.
- Deleting a list deletes its cards.
- Deleting a card deletes label assignments, member assignments, and checklists.
- Deleting a label removes only its card assignments.
- Deleting a member removes only their card assignments.

## Step 7: Add Indexes

Add indexes for common reads and filters.

Recommended indexes:

- `lists(board_id, position)`
- `cards(list_id, position)`
- `cards(title)`
- `cards(due_date)`
- `cards(archived)`
- `labels(board_id)`
- `card_labels(label_id)`
- `card_members(member_id)`
- `checklists(card_id, position)`
- `checklist_items(checklist_id, position)`

For title search, start with simple case-insensitive search. Later, upgrade to PostgreSQL full-text search if needed.

## Step 8: Design API-Friendly Query Shape

The main board loading query should return:

- Board details
- Lists ordered by `position`
- Cards inside each list ordered by `position`
- Card labels
- Card members
- Checklist summaries or full checklist details depending on UI needs

For the first version, loading full board data in one endpoint is acceptable:

```text
GET /api/boards/:boardId
```

## Step 9: Seed Data

Create seed data so the UI can be developed easily.

Seed:

- One demo board
- Three lists: `To Do`, `In Progress`, `Done`
- A few cards in each list
- Five labels with different colors
- Three to five members
- One or two checklist examples

## Step 10: Validate the Schema Before Implementation

Before coding the API, verify these workflows against the schema:

- Create board
- Add list to board
- Reorder lists
- Add card to list
- Move card to another list
- Reorder cards within a list
- Edit card description
- Archive card
- Attach/remove label
- Assign/remove member
- Set/clear due date
- Add checklist item
- Mark checklist item complete
- Search cards by title
- Filter cards by label, member, and due date

## Assumptions

- You will design the schema manually before backend implementation.
- PostgreSQL is the database.
- No user authentication in the first schema version.
- Member assignment uses seeded `members`.
- Cards are archived with an `archived` boolean instead of being physically deleted by default.
<!--
File summary:
- Database schema planning document.
- Captures intended schema direction and implementation notes.
- Use this when evaluating future persistence changes.
-->
