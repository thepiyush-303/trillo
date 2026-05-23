import { Router } from 'express';
import { pool } from '../db/pool.js';

export const boardsRouter = Router();

const listAccents = ['#55326f', '#5e4900', '#14583b', '#111600', '#164555', '#4c2f22'];

// Sends a consistent JSON error response for API failures.
function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

// Converts a database date value to the client YYYY-MM-DD string shape.
function mapDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

// Converts a database board row into the client board shape.
function mapBoard(row) {
  return {
    id: row.id,
    title: row.title,
    background: row.background || null,
    members: [],
    lists: []
  };
}

// Converts a database list row into the client list shape.
function mapList(row, index = 0) {
  return {
    id: row.id,
    title: row.title,
    position: row.position,
    accent: listAccents[index % listAccents.length],
    cards: []
  };
}

// Converts a database card row into the client card shape.
function mapCard(row) {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description,
    position: row.position,
    dueDate: mapDate(row.due_date),
    dueTime: row.due_time || '',
    isCompleted: Boolean(row.due_date_completed),
    dueDateCompleted: Boolean(row.due_date_completed),
    dueDateReminder: row.due_date_reminder || '1 Day before',
    dueDateRecurring: row.due_date_recurring || 'Never',
    dueReminder: row.due_date_reminder || '1 Day before',
    dueRecurring: row.due_date_recurring || 'Never',
    cover: row.cover || null,
    archived: row.archived,
    labels: Array.isArray(row.labels) ? row.labels : []
  };
}

// Converts an archived card row into the client archive shape.
function mapArchivedCard(row) {
  return {
    ...mapCard(row),
    archive: {
      originalListId: row.original_list_id,
      originalPosition: row.original_position,
      archivedAt: row.archived_at
    }
  };
}

// Reads a validated cover object from card update bodies.
function readCover(request) {
  const cover = request.body?.cover;

  if (!cover || typeof cover !== 'object') {
    return null;
  }

  if (cover.type === 'image' && cover.url) {
    return {
      type: 'image',
      url: String(cover.url),
      position: String(cover.position || 'center'),
      blur: Boolean(cover.blur)
    };
  }

  if (cover.type === 'color' && cover.color) {
    return {
      type: 'color',
      color: String(cover.color)
    };
  }

  return null;
}

// Reads a validated board background object from update bodies.
function readBackground(request) {
  const background = request.body?.background;

  if (!background || typeof background !== 'object') {
    return null;
  }

  if (background.type === 'image' && background.url) {
    return {
      type: 'image',
      url: String(background.url),
      position: String(background.position || 'center')
    };
  }

  if (background.type === 'color' && background.value) {
    return {
      type: 'color',
      value: String(background.value)
    };
  }

  return null;
}

// Converts an inbox database row into the client inbox card shape.
function mapInboxCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    position: row.position,
    labels: Array.isArray(row.labels) ? row.labels : [],
    convertedCardId: row.converted_card_id
  };
}

// Normalizes required title input from request bodies.
function readTitle(request) {
  return String(request.body?.title || '').trim();
}

// Reads the next position value for a board list.
async function getNextListPosition(boardId) {
  const result = await pool.query(
    'select coalesce(max(position), 0) + 1000 as position from lists where board_id = $1',
    [boardId]
  );

  return result.rows[0].position;
}

// Reads the next position value for a card in a list.
async function getNextCardPosition(listId) {
  const result = await pool.query(
    'select coalesce(max(position), 0) + 1000 as position from cards where list_id = $1',
    [listId]
  );

  return result.rows[0].position;
}

// Updates card order for one list using the provided card ids.
async function updateCardPositions(client, listId, cardIds) {
  for (const [index, cardId] of cardIds.entries()) {
    await client.query(
      'update cards set list_id = $1, position = $2, updated_at = now() where id = $3',
      [listId, (index + 1) * 1000, cardId]
    );
  }
}

// Updates list order for one board using the provided list ids.
async function updateListPositions(client, boardId, listIds) {
  for (const [index, listId] of listIds.entries()) {
    await client.query(
      'update lists set position = $1, updated_at = now() where id = $2 and board_id = $3',
      [(index + 1) * 1000, listId, boardId]
    );
  }
}

// Lists all available boards in creation order.
async function getBoards(_request, response) {
  const result = await pool.query('select id, title, background from boards order by created_at asc');
  response.json({ boards: result.rows.map(mapBoard) });
}

// Creates a new board with a title.
async function createBoard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Board title is required.');
    return;
  }

  const result = await pool.query('insert into boards (title) values ($1) returning id, title, background', [title]);
  response.status(201).json({ board: mapBoard(result.rows[0]) });
}

// Loads one board with its ordered lists and non-archived cards.
async function getBoard(request, response) {
  const { boardId } = request.params;
  const boardResult = await pool.query('select id, title, background from boards where id = $1', [boardId]);

  if (boardResult.rowCount === 0) {
    sendError(response, 404, 'Board not found.');
    return;
  }

  const listResult = await pool.query(
    'select id, board_id, title, position from lists where board_id = $1 order by position asc, id asc',
    [boardId]
  );
  const cardsResult = await pool.query(
    `select cards.id, cards.list_id, cards.title, cards.description, cards.position, cards.due_date, cards.due_time, cards.due_date_completed, cards.due_date_reminder, cards.due_date_recurring, cards.cover, cards.archived, cards.labels
     from cards
     join lists on lists.id = cards.list_id
     where lists.board_id = $1 and cards.archived = false
     order by cards.position asc, cards.id asc`,
    [boardId]
  );
  const labelsResult = await pool.query(
    `select card_labels.card_id, labels.id, labels.name, labels.color
     from card_labels
     join labels on labels.id = card_labels.label_id
     join cards on cards.id = card_labels.card_id
     join lists on lists.id = cards.list_id
     where lists.board_id = $1
     order by labels.id asc`,
    [boardId]
  );
  const membersResult = await pool.query('select id, name, avatar_color from members order by id asc limit 5');

  const labelsByCardId = labelsResult.rows.reduce((labelsByCard, label) => {
    const cardLabels = labelsByCard.get(label.card_id) || [];
    cardLabels.push({ id: label.id, name: label.name, color: label.color });
    labelsByCard.set(label.card_id, cardLabels);
    return labelsByCard;
  }, new Map());

  const board = mapBoard(boardResult.rows[0]);
  board.members = membersResult.rows.map((member) => ({
    id: member.id,
    initials: member.name.slice(0, 2).toUpperCase(),
    color: member.avatar_color
  }));
  board.lists = listResult.rows.map((list, index) => mapList(list, index));

  for (const card of cardsResult.rows.map(mapCard)) {
    const list = board.lists.find((item) => item.id === card.listId);

    if (list) {
      list.cards.push({ ...card, labels: [...(card.labels || []), ...(labelsByCardId.get(card.id) || [])] });
    }
  }

  response.json({ board });
}

// Lists archived cards for one board from the durable archive table.
async function getArchivedCards(request, response) {
  const result = await pool.query(
    `select cards.id, cards.list_id, cards.title, cards.description, cards.position, cards.due_date, cards.due_time, cards.due_date_completed, cards.due_date_reminder, cards.due_date_recurring, cards.cover, cards.archived, cards.labels,
            archived_cards.original_list_id, archived_cards.original_position, archived_cards.archived_at
     from archived_cards
     join cards on cards.id = archived_cards.card_id
     where archived_cards.board_id = $1
     order by archived_cards.archived_at desc, archived_cards.card_id desc`,
    [request.params.boardId]
  );

  response.json({ cards: result.rows.map(mapArchivedCard) });
}

// Restores one archived card back to the list and position captured at archive time.
async function restoreCard(request, response) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const archiveResult = await client.query(
      `select card_id, original_list_id, original_position
       from archived_cards
       where card_id = $1
       for update`,
      [request.params.cardId]
    );

    if (archiveResult.rowCount === 0) {
      await client.query('rollback');
      sendError(response, 404, 'Archived card not found.');
      return;
    }

    const archive = archiveResult.rows[0];
    const result = await client.query(
      `update cards set archived = false, list_id = $1, position = $2, updated_at = now()
       where id = $3 returning id, list_id, title, description, position, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, archived, labels`,
      [archive.original_list_id, archive.original_position, archive.card_id]
    );

    await client.query('delete from archived_cards where card_id = $1', [archive.card_id]);
    await client.query('commit');

    response.json({ card: mapCard(result.rows[0]) });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

// Updates a board title.
async function updateBoard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Board title is required.');
    return;
  }

  const result = await pool.query(
    'update boards set title = $1, updated_at = now() where id = $2 returning id, title, background',
    [title, request.params.boardId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Board not found.');
    return;
  }

  response.json({ board: mapBoard(result.rows[0]) });
}

// Updates a board background.
async function updateBoardBackground(request, response) {
  const background = readBackground(request);
  const result = await pool.query(
    `update boards set background = $1::jsonb, updated_at = now()
     where id = $2 returning id, title, background`,
    [background ? JSON.stringify(background) : null, request.params.boardId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Board not found.');
    return;
  }

  response.json({ board: mapBoard(result.rows[0]) });
}

// Creates a list at the end of a board.
async function createList(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'List title is required.');
    return;
  }

  const position = await getNextListPosition(request.params.boardId);
  const result = await pool.query(
    `insert into lists (board_id, title, position)
     values ($1, $2, $3)
     returning id, board_id, title, position`,
    [request.params.boardId, title, position]
  );

  response.status(201).json({ list: mapList(result.rows[0]) });
}

// Persists horizontal list ordering for one board.
async function reorderLists(request, response) {
  const { listIds = [] } = request.body || {};

  if (!Array.isArray(listIds) || listIds.length === 0) {
    sendError(response, 400, 'List id array is required.');
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await updateListPositions(client, request.params.boardId, listIds);
    await client.query('commit');
    response.json({ ok: true });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

// Updates a list title.
async function updateList(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'List title is required.');
    return;
  }

  const result = await pool.query(
    `update lists set title = $1, updated_at = now()
     where id = $2 returning id, board_id, title, position`,
    [title, request.params.listId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'List not found.');
    return;
  }

  response.json({ list: mapList(result.rows[0]) });
}

// Deletes a list and its cards.
async function deleteList(request, response) {
  const result = await pool.query('delete from lists where id = $1', [request.params.listId]);

  if (result.rowCount === 0) {
    sendError(response, 404, 'List not found.');
    return;
  }

  response.status(204).end();
}

// Creates a card at the end of a list.
async function createCard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Card title is required.');
    return;
  }

  const position = await getNextCardPosition(request.params.listId);
  const result = await pool.query(
    `insert into cards (list_id, title, position)
     values ($1, $2, $3)
     returning id, list_id, title, description, position, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, archived, labels`,
    [request.params.listId, title, position]
  );

  response.status(201).json({ card: mapCard(result.rows[0]) });
}

// Persists card movement and ordering across one or two lists.
async function reorderCards(request, response) {
  const { sourceListId, targetListId, sourceCardIds = [], targetCardIds = [] } = request.body || {};

  if (!sourceListId || !targetListId || !Array.isArray(sourceCardIds) || !Array.isArray(targetCardIds)) {
    sendError(response, 400, 'Source list, target list, and card id arrays are required.');
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await updateCardPositions(client, sourceListId, sourceCardIds);

    if (String(sourceListId) !== String(targetListId)) {
      await updateCardPositions(client, targetListId, targetCardIds);
    }

    await client.query('commit');
    response.json({ ok: true });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

// Updates editable card fields.
async function updateCard(request, response) {
  const title = readTitle(request);
  const description = String(request.body?.description || '');
  const dueDate = request.body?.dueDate ? String(request.body.dueDate) : null;
  const dueTime = request.body?.dueTime ? String(request.body.dueTime) : '';
  const dueDateCompleted = Boolean(request.body?.dueDateCompleted || request.body?.isCompleted);
  const dueDateReminder = String(request.body?.dueDateReminder || request.body?.dueReminder || '1 Day before');
  const dueDateRecurring = String(request.body?.dueDateRecurring || request.body?.dueRecurring || 'Never');
  const cover = readCover(request);

  if (!title) {
    sendError(response, 400, 'Card title is required.');
    return;
  }

  const result = await pool.query(
    `update cards set title = $1, description = $2, due_date = $3, due_time = $4,
       due_date_completed = $5, due_date_reminder = $6, due_date_recurring = $7,
       cover = $8::jsonb, updated_at = now()
     where id = $9 returning id, list_id, title, description, position, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, archived, labels`,
    [
      title,
      description,
      dueDate,
      dueTime,
      dueDateCompleted,
      dueDateReminder,
      dueDateRecurring,
      cover ? JSON.stringify(cover) : null,
      request.params.cardId
    ]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Card not found.');
    return;
  }

  response.json({ card: mapCard(result.rows[0]) });
}

// Deletes one card permanently.
async function deleteCard(request, response) {
  const result = await pool.query('delete from cards where id = $1', [request.params.cardId]);

  if (result.rowCount === 0) {
    sendError(response, 404, 'Card not found.');
    return;
  }

  response.status(204).end();
}

// Marks one card as archived and records its original board/list position.
async function archiveCard(request, response) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const cardResult = await client.query(
      `select cards.id, cards.list_id, cards.position, lists.board_id
       from cards
       join lists on lists.id = cards.list_id
       where cards.id = $1
       for update`,
      [request.params.cardId]
    );

    if (cardResult.rowCount === 0) {
      await client.query('rollback');
      sendError(response, 404, 'Card not found.');
      return;
    }

    const card = cardResult.rows[0];
    await client.query(
      `insert into archived_cards (card_id, board_id, original_list_id, original_position)
       values ($1, $2, $3, $4)
       on conflict (card_id) do update set
         board_id = excluded.board_id,
         original_list_id = excluded.original_list_id,
         original_position = excluded.original_position,
         archived_at = now()`,
      [card.id, card.board_id, card.list_id, card.position]
    );

    await client.query(
      `update cards set archived = true, updated_at = now()
       where id = $1`,
      [card.id]
    );

    const archivedResult = await client.query(
      `select cards.id, cards.list_id, cards.title, cards.description, cards.position, cards.due_date, cards.due_time, cards.due_date_completed, cards.due_date_reminder, cards.due_date_recurring, cards.cover, cards.archived, cards.labels,
              archived_cards.original_list_id, archived_cards.original_position, archived_cards.archived_at
       from archived_cards
       join cards on cards.id = archived_cards.card_id
       where archived_cards.card_id = $1`,
      [card.id]
    );

    await client.query('commit');

    response.json({ card: mapArchivedCard(archivedResult.rows[0]) });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

// Moves a board card back into the Inbox while preserving Inbox-style labels.
async function moveCardToInbox(request, response) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const cardResult = await client.query(
      `select id, title, description, labels
       from cards
       where id = $1
       for update`,
      [request.params.cardId]
    );

    if (cardResult.rowCount === 0) {
      await client.query('rollback');
      sendError(response, 404, 'Card not found.');
      return;
    }

    const positionResult = await client.query('select coalesce(max(position), 0) + 1000 as position from inbox_cards');
    const card = cardResult.rows[0];
    const inboxResult = await client.query(
      `insert into inbox_cards (title, description, labels, position)
       values ($1, $2, $3::jsonb, $4)
       returning id, title, description, position, labels, converted_card_id`,
      [card.title, card.description || '', JSON.stringify(Array.isArray(card.labels) ? card.labels : []), positionResult.rows[0].position]
    );

    await client.query('delete from cards where id = $1', [card.id]);
    await client.query('commit');

    response.status(201).json({ inboxCard: mapInboxCard(inboxResult.rows[0]) });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

boardsRouter.get('/boards', getBoards);
boardsRouter.post('/boards', createBoard);
boardsRouter.get('/boards/:boardId', getBoard);
boardsRouter.get('/boards/:boardId/archived-cards', getArchivedCards);
boardsRouter.patch('/boards/:boardId', updateBoard);
boardsRouter.patch('/boards/:boardId/background', updateBoardBackground);
boardsRouter.post('/boards/:boardId/lists', createList);
boardsRouter.patch('/boards/:boardId/lists/reorder', reorderLists);
boardsRouter.patch('/lists/:listId', updateList);
boardsRouter.delete('/lists/:listId', deleteList);
boardsRouter.post('/lists/:listId/cards', createCard);
boardsRouter.patch('/cards/reorder', reorderCards);
boardsRouter.post('/cards/:cardId/move-to-inbox', moveCardToInbox);
boardsRouter.patch('/cards/:cardId', updateCard);
boardsRouter.delete('/cards/:cardId', deleteCard);
boardsRouter.patch('/cards/:cardId/archive', archiveCard);
boardsRouter.patch('/cards/:cardId/restore', restoreCard);
