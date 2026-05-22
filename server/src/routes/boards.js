import { Router } from 'express';
import { pool } from '../db/pool.js';

export const boardsRouter = Router();

const listAccents = ['#55326f', '#5e4900', '#14583b', '#111600', '#164555', '#4c2f22'];

// Sends a consistent JSON error response for API failures.
function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

// Converts a database board row into the client board shape.
function mapBoard(row) {
  return {
    id: row.id,
    title: row.title,
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
    dueDate: row.due_date,
    archived: row.archived
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

// Lists all available boards in creation order.
async function getBoards(_request, response) {
  const result = await pool.query('select id, title from boards order by created_at asc');
  response.json({ boards: result.rows.map(mapBoard) });
}

// Creates a new board with a title.
async function createBoard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Board title is required.');
    return;
  }

  const result = await pool.query('insert into boards (title) values ($1) returning id, title', [title]);
  response.status(201).json({ board: mapBoard(result.rows[0]) });
}

// Loads one board with its ordered lists and non-archived cards.
async function getBoard(request, response) {
  const { boardId } = request.params;
  const boardResult = await pool.query('select id, title from boards where id = $1', [boardId]);

  if (boardResult.rowCount === 0) {
    sendError(response, 404, 'Board not found.');
    return;
  }

  const listResult = await pool.query(
    'select id, board_id, title, position from lists where board_id = $1 order by position asc, id asc',
    [boardId]
  );
  const cardsResult = await pool.query(
    `select cards.id, cards.list_id, cards.title, cards.description, cards.position, cards.due_date, cards.archived
     from cards
     join lists on lists.id = cards.list_id
     where lists.board_id = $1 and cards.archived = false
     order by cards.position asc, cards.id asc`,
    [boardId]
  );
  const membersResult = await pool.query('select id, name, avatar_color from members order by id asc limit 5');

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
      list.cards.push(card);
    }
  }

  response.json({ board });
}

// Updates a board title.
async function updateBoard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Board title is required.');
    return;
  }

  const result = await pool.query(
    'update boards set title = $1, updated_at = now() where id = $2 returning id, title',
    [title, request.params.boardId]
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
     returning id, list_id, title, description, position, due_date, archived`,
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

  if (!title) {
    sendError(response, 400, 'Card title is required.');
    return;
  }

  const result = await pool.query(
    `update cards set title = $1, description = $2, updated_at = now()
     where id = $3 returning id, list_id, title, description, position, due_date, archived`,
    [title, description, request.params.cardId]
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

// Marks one card as archived so it no longer appears on the board.
async function archiveCard(request, response) {
  const result = await pool.query(
    `update cards set archived = true, updated_at = now()
     where id = $1 returning id, list_id, title, description, position, due_date, archived`,
    [request.params.cardId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Card not found.');
    return;
  }

  response.json({ card: mapCard(result.rows[0]) });
}

boardsRouter.get('/boards', getBoards);
boardsRouter.post('/boards', createBoard);
boardsRouter.get('/boards/:boardId', getBoard);
boardsRouter.patch('/boards/:boardId', updateBoard);
boardsRouter.post('/boards/:boardId/lists', createList);
boardsRouter.patch('/lists/:listId', updateList);
boardsRouter.delete('/lists/:listId', deleteList);
boardsRouter.post('/lists/:listId/cards', createCard);
boardsRouter.patch('/cards/reorder', reorderCards);
boardsRouter.patch('/cards/:cardId', updateCard);
boardsRouter.delete('/cards/:cardId', deleteCard);
boardsRouter.patch('/cards/:cardId/archive', archiveCard);
