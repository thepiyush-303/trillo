# Trello-Style Kanban Project Plan

## Summary

Build a Trello-style Kanban project management web application using React + Vite, Node.js + Express, and PostgreSQL. The first implementation should open directly into the application shell with a mock signed-in user, not a public landing page or real authentication flow.

The visual target is the dark Trello board experience shown in the reference screenshot: dark top navigation, left Inbox panel, purple board background, compact rounded lists, card previews, board controls, and horizontal list scrolling.

The public landing/login page and tutorial system can be added later. For the first version, tutorial-like content can be represented as seed data.

## Product Goals

- Let users visually manage project work with boards, lists, and cards.
- Let users create and organize tasks using drag-and-drop.
- Let users open cards and manage practical task details like labels, members, due dates, descriptions, and checklists.
- Include a basic Inbox panel so users can quickly capture tasks before moving them into board lists.
- Keep the first version focused on core workflow features instead of implementing every Trello feature.

## Technical Stack

- Frontend: React + Vite single-page application.
- Backend: Node.js with Express.js.
- Database: PostgreSQL.
- API style: REST.
- Drag-and-drop: use an established React drag-and-drop library.
- Authentication: deferred; use one mock current user and seeded members for now.

## UI and Interaction Plan

### App Shell

- Dark top navigation bar.
- App logo/name area.
- Search input in the top bar.
- `Create` button for quick creation actions.
- Placeholder icons for notifications, help, settings, and profile.
- Circular user avatar using mock current user data.

### Board View

- Board header with:
  - Board title.
  - View/action icons.
  - Share button placeholder.
  - Overflow menu placeholder.
- Purple board canvas.
- Horizontally scrollable list area.
- `Add another list` column at the end.
- Lists should keep a compact Trello-style width and not stretch to fill the screen.

### Inbox Panel

- Left sidebar titled `Inbox`.
- Inline `Add a card` input.
- Inbox card previews.
- Users can create quick inbox tasks.
- Users can convert or move inbox tasks into a board list.

### Lists

- Create lists with a title.
- Edit list title inline.
- Delete lists.
- Reorder lists horizontally with drag-and-drop.
- Each list contains ordered cards.
- Each list has an inline `Add a card` action.

### Cards

- Create cards with a title.
- Show cards as compact previews inside lists.
- Edit card title.
- Edit card description from the detail modal.
- Archive or delete cards.
- Drag cards within the same list.
- Drag cards between different lists.
- Show optional card badges for:
  - Description exists.
  - Due date.
  - Checklist progress.
  - Labels.
  - Assigned members.

### Card Details Modal

- Open when a card is clicked.
- Editable card title.
- Editable card description.
- Label management.
- Due date picker.
- Member assignment.
- Checklist management.
- Archive/delete actions.

### Search and Filter

- Search cards by title.
- Filter cards by label.
- Filter cards by member.
- Filter cards by due date status:
  - No due date.
  - Due soon.
  - Overdue.
- Filtering should affect visible cards only and should not destroy the saved card order.

## Data Model

The schema design is handled separately in `docs/database-schema-plan.md`, but the application plan expects these resources:

- `boards`
- `lists`
- `cards`
- `labels`
- `card_labels`
- `members`
- `card_members`
- `checklists`
- `checklist_items`
- `inbox_cards`

Ordering should be persisted with `position` fields for:

- Lists.
- Cards.
- Inbox cards.
- Checklists.
- Checklist items.

## API Plan

### Boards

- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:boardId`
- `PATCH /api/boards/:boardId`

### Lists

- `POST /api/boards/:boardId/lists`
- `PATCH /api/lists/:listId`
- `DELETE /api/lists/:listId`
- `PATCH /api/boards/:boardId/lists/reorder`

### Cards

- `POST /api/lists/:listId/cards`
- `PATCH /api/cards/:cardId`
- `DELETE /api/cards/:cardId`
- `PATCH /api/cards/:cardId/archive`
- `PATCH /api/cards/reorder`

### Inbox Cards

- `GET /api/inbox-cards`
- `POST /api/inbox-cards`
- `PATCH /api/inbox-cards/:inboxCardId`
- `DELETE /api/inbox-cards/:inboxCardId`
- `POST /api/inbox-cards/:inboxCardId/convert`

The convert endpoint should create a normal board card in a selected list, then mark the inbox card as converted or remove it from active inbox results.

### Labels

- `GET /api/boards/:boardId/labels`
- `POST /api/cards/:cardId/labels/:labelId`
- `DELETE /api/cards/:cardId/labels/:labelId`

### Members

- `GET /api/members`
- `POST /api/cards/:cardId/members/:memberId`
- `DELETE /api/cards/:cardId/members/:memberId`

### Checklists

- `POST /api/cards/:cardId/checklists`
- `PATCH /api/checklists/:checklistId`
- `DELETE /api/checklists/:checklistId`
- `POST /api/checklists/:checklistId/items`
- `PATCH /api/checklist-items/:itemId`
- `DELETE /api/checklist-items/:itemId`

### Search and Filter

- `GET /api/boards/:boardId?search=&labelId=&memberId=&due=`

The board endpoint may accept filters and return only matching cards, or the frontend may filter already-loaded board data for the first version. Prefer frontend filtering first for speed of implementation, then move filtering to the API if the board data becomes large.

## Milestones

### Milestone 1: Project Foundation

Goal: create the base project structure and make frontend, backend, and database ready for feature work.

Functions/features added:

- Create `client/` React + Vite app.
- Create `server/` Express app.
- Add shared development scripts.
- Configure PostgreSQL connection.
- Add environment variables for server port, client URL, and database URL.
- Add migration and seed workflow.
- Add basic health endpoint: `GET /api/health`.
- Add seed data for one demo board, basic lists, sample cards, labels, and members.

Completion criteria:

- Client app starts successfully.
- Server app starts successfully.
- Server connects to PostgreSQL.
- Seed data can be loaded.
- Health endpoint returns a successful response.

### Milestone 2: App Shell and Board Layout

Goal: build the main visual structure that resembles the Trello board screenshot.

Functions/features added:

- Render dark top navigation bar.
- Render search input in top bar.
- Render `Create` button.
- Render mock user avatar.
- Render left Inbox sidebar shell.
- Render board header with title and placeholder actions.
- Render purple board canvas.
- Render horizontally scrollable list container.
- Render list columns from seed data.
- Render card previews inside lists.
- Render `Add another list` UI.

Completion criteria:

- User lands directly on the board screen.
- Board visually matches the dark Trello-style layout direction.
- Lists and cards from seed data are visible.
- Layout supports horizontal scrolling when many lists exist.

### Milestone 3: Board, List, and Card CRUD

Goal: make the core board workflow editable and persistent.

Functions/features added:

- Create board with title.
- Load board details with lists and cards.
- Edit board title.
- Create list.
- Edit list title inline.
- Delete list.
- Create card inside a list.
- Edit card title.
- Delete card.
- Archive card.
- Persist all changes through the Express API.

Completion criteria:

- User can create and rename lists.
- User can create and rename cards.
- User can delete lists.
- User can archive or delete cards.
- Reloading the page keeps saved changes.

### Milestone 4: Inbox Capture Flow

Goal: make the left Inbox panel functional for quick task capture.

Functions/features added:

- Create inbox card from the Inbox input.
- Render inbox card previews.
- Edit inbox card title.
- Delete inbox card.
- Convert inbox card into a board card.
- Select or default the target list for conversion.
- Remove converted card from active inbox view.

Completion criteria:

- User can add quick tasks to Inbox.
- User can convert an Inbox item into a card on the board.
- Converted board card appears in the selected list.
- Inbox remains independent from board lists.

### Milestone 5: Drag-and-Drop Ordering

Goal: support Trello-style visual organization through drag-and-drop.

Functions/features added:

- Drag lists horizontally to reorder them.
- Persist list order.
- Drag cards within the same list to reorder them.
- Drag cards from one list to another.
- Persist card `list_id` and `position` after drag.
- Show useful loading/error behavior if reorder persistence fails.

Completion criteria:

- List order remains after page reload.
- Card order remains after page reload.
- Cards can move between lists.
- Failed reorder operations do not leave the UI in a confusing state.

### Milestone 6: Card Details Modal

Goal: let users manage the details of a task from a Trello-style card modal.

Functions/features added:

- Open card detail modal from card preview click.
- Edit card title in modal.
- Edit card description.
- Add labels to card.
- Remove labels from card.
- Set due date.
- Clear due date.
- Assign seeded members to card.
- Remove assigned members from card.
- Add checklist to card.
- Add checklist item.
- Edit checklist item title.
- Mark checklist item complete/incomplete.
- Delete checklist item.
- Delete checklist.

Completion criteria:

- Card detail changes persist after reload.
- Card preview updates after detail changes.
- Checklist progress appears on card preview.
- Labels, members, and due dates are visible on card previews where applicable.

### Milestone 7: Search and Filters

Goal: help users quickly find cards on larger boards.

Functions/features added:

- Search cards by title.
- Filter by label.
- Filter by assigned member.
- Filter by due date status.
- Clear all filters.
- Show an empty state when no cards match.
- Preserve original card/list order when filters are cleared.

Completion criteria:

- Search results update visible cards.
- Label/member/due date filters can be combined.
- Clearing filters restores the full board.
- Filtering does not change saved card order.

### Milestone 8: Visual Polish and UX Hardening

Goal: improve usability, polish, and reliability after core features work.

Functions/features added:

- Loading states for board and card detail modal.
- Error states for failed API requests.
- Empty states for boards, lists, Inbox, and search results.
- Consistent hover/focus states.
- Better keyboard behavior for forms.
- Responsive adjustments for smaller screens.
- Icon pass using a consistent icon library.
- Visual polish for spacing, shadows, rounded corners, colors, and typography.

Completion criteria:

- App feels coherent and usable.
- UI remains readable across common desktop and tablet widths.
- Forms handle cancel/save states cleanly.
- API errors are visible and recoverable.

### Later Milestones

These are intentionally out of scope for the first core build:

- Public landing page similar to the first screenshot.
- Real signup/login/session authentication.
- Workspace and multi-user permissions.
- Full tutorial system.
- Comments and activity feed.
- Attachments.
- Notifications.
- Calendar/planner view.
- Board templates.

## Test Plan

### API Tests

- Health endpoint returns success.
- Board creation and board detail loading.
- List create/edit/delete.
- Card create/edit/archive/delete.
- Inbox card create/edit/delete/convert.
- List reorder persistence.
- Card reorder persistence.
- Card move-between-lists persistence.
- Label assignment and removal.
- Member assignment and removal.
- Due date update and clearing.
- Checklist and checklist item mutations.

### Frontend Tests

- App shell renders top bar, Inbox, board header, lists, and cards.
- User can add a list.
- User can add a card to a list.
- User can add an Inbox card.
- User can convert an Inbox card to a board card.
- User can open card detail modal.
- User can update card description.
- User can assign labels, members, due date, and checklist items.
- Search and filters update visible cards.

### Manual Acceptance Tests

- User opens the app and sees a dark Trello-style board screen.
- User creates a list and card.
- User creates an Inbox card and converts it into a board card.
- User drags cards within and across lists.
- User drags lists to reorder them.
- User opens a card and edits details.
- User searches and filters cards.
- Reloading the page keeps persisted board data.

## Assumptions

- Use React + Vite, not Next.js.
- Use Express.js for the backend API.
- Use PostgreSQL for persistent storage.
- No real authentication in the first implementation.
- Use one mock current user in the frontend.
- Use seeded members for member assignment.
- Use seeded tutorial-like cards only as demo content.
- Include a basic functional Inbox in the first implementation.
- Use the dark Trello-like board screenshot as the visual target.
- The UI should resemble Trello's layout and interaction patterns without copying proprietary assets or branding.
<!--
File summary:
- Project planning document.
- Tracks feature goals, implementation phases, and product direction.
- Use this for roadmap-level context.
-->
