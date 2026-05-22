import { Router } from 'express';
import { pool } from '../db/pool.js';

export const inboxRouter = Router();

// Sends a consistent JSON error response for Inbox API failures.
function sendError(response, status, message) {
  response.status(status).json({ error: message });
}

// Converts an inbox database row into the client inbox card shape.
function mapInboxCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    position: row.position,
    convertedCardId: row.converted_card_id
  };
}

// Converts a card database row into the client card shape.
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

// Reads the next position value for an inbox card.
async function getNextInboxPosition() {
  const result = await pool.query('select coalesce(max(position), 0) + 1000 as position from inbox_cards');

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

// Lists active inbox cards in saved order.
async function getInboxCards(_request, response) {
  const result = await pool.query(
    `select id, title, description, position, converted_card_id
     from inbox_cards
     where converted_card_id is null
     order by position asc, id asc`
  );

  response.json({ inboxCards: result.rows.map(mapInboxCard) });
}

// Creates an inbox card at the end of the Inbox.
async function createInboxCard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Inbox card title is required.');
    return;
  }

  const position = await getNextInboxPosition();
  const result = await pool.query(
    `insert into inbox_cards (title, description, position)
     values ($1, $2, $3)
     returning id, title, description, position, converted_card_id`,
    [title, String(request.body?.description || ''), position]
  );

  response.status(201).json({ inboxCard: mapInboxCard(result.rows[0]) });
}

// Updates an inbox card title and description.
async function updateInboxCard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Inbox card title is required.');
    return;
  }

  const result = await pool.query(
    `update inbox_cards set title = $1, description = $2, updated_at = now()
     where id = $3 and converted_card_id is null
     returning id, title, description, position, converted_card_id`,
    [title, String(request.body?.description || ''), request.params.inboxCardId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Inbox card not found.');
    return;
  }

  response.json({ inboxCard: mapInboxCard(result.rows[0]) });
}

// Deletes one active inbox card.
async function deleteInboxCard(request, response) {
  const result = await pool.query(
    'delete from inbox_cards where id = $1 and converted_card_id is null',
    [request.params.inboxCardId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Inbox card not found.');
    return;
  }

  response.status(204).end();
}

// Converts an inbox card into a normal board card in the requested list.
async function convertInboxCard(request, response) {
  const targetListId = request.body?.listId;

  if (!targetListId) {
    sendError(response, 400, 'Target list is required.');
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const inboxResult = await client.query(
      `select id, title, description
       from inbox_cards
       where id = $1 and converted_card_id is null
       for update`,
      [request.params.inboxCardId]
    );

    if (inboxResult.rowCount === 0) {
      await client.query('rollback');
      sendError(response, 404, 'Inbox card not found.');
      return;
    }

    const positionResult = await client.query(
      'select coalesce(max(position), 0) + 1000 as position from cards where list_id = $1',
      [targetListId]
    );
    const inboxCard = inboxResult.rows[0];
    const cardResult = await client.query(
      `insert into cards (list_id, title, description, position)
       values ($1, $2, $3, $4)
       returning id, list_id, title, description, position, due_date, archived`,
      [targetListId, inboxCard.title, inboxCard.description, positionResult.rows[0].position]
    );

    await client.query(
      'update inbox_cards set converted_card_id = $1, updated_at = now() where id = $2',
      [cardResult.rows[0].id, inboxCard.id]
    );
    await client.query('commit');

    response.status(201).json({ card: mapCard(cardResult.rows[0]) });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
inboxRouter.get('/inbox-cards', getInboxCards);
inboxRouter.post('/inbox-cards', createInboxCard);
inboxRouter.patch('/inbox-cards/:inboxCardId', updateInboxCard);
inboxRouter.delete('/inbox-cards/:inboxCardId', deleteInboxCard);
inboxRouter.post('/inbox-cards/:inboxCardId/convert', convertInboxCard);
