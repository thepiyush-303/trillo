import { Router } from 'express';
import { pool } from '../db/pool.js';

export const inboxRouter = Router();

// Sends a consistent JSON error response for Inbox API failures.
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

// Converts an inbox database row into the client inbox card shape.
function mapInboxCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    position: row.position,
    labels: Array.isArray(row.labels) ? row.labels : [],
    dueDate: mapDate(row.due_date) || '',
    dueTime: row.due_time || '',
    isCompleted: Boolean(row.due_date_completed),
    dueDateCompleted: Boolean(row.due_date_completed),
    dueDateReminder: row.due_date_reminder || '1 Day before',
    dueDateRecurring: row.due_date_recurring || 'Never',
    dueReminder: row.due_date_reminder || '1 Day before',
    dueRecurring: row.due_date_recurring || 'Never',
    cover: row.cover || null,
    convertedCardId: row.converted_card_id
  };
}

// Converts an inbox label row into the client label shape.
function mapInboxLabel(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position
  };
}

// Reads clean label values from a request body.
// Reads a validated cover object from request bodies.
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

// Reads optional due date fields from request bodies.
function readDueDateFields(request) {
  return {
    dueDate: request.body?.dueDate ? String(request.body.dueDate) : null,
    dueTime: request.body?.dueTime ? String(request.body.dueTime) : '',
    dueDateCompleted: Boolean(request.body?.dueDateCompleted || request.body?.isCompleted),
    dueDateReminder: String(request.body?.dueDateReminder || request.body?.dueReminder || '1 Day before'),
    dueDateRecurring: String(request.body?.dueDateRecurring || request.body?.dueRecurring || 'Never')
  };
}

function readLabels(request) {
  const labels = request.body?.labels;

  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((label) => {
      if (typeof label === 'string') {
        return label;
      }

      if (label && typeof label === 'object') {
        return {
          id: String(label.id || label.color || '').trim(),
          name: String(label.name || ''),
          color: String(label.color || '#579dff')
        };
      }

      return null;
    })
    .filter(Boolean);
}

// Creates a stable text id for newly created inbox labels.
function createLabelId() {
  return `label-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Converts a card database row into the client card shape.
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
    `select id, title, description, position, labels, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, converted_card_id
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
  const dueDateFields = readDueDateFields(request);
  const cover = readCover(request);
  const result = await pool.query(
    `insert into inbox_cards (title, description, labels, position, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover)
     values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10::jsonb)
     returning id, title, description, position, labels, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, converted_card_id`,
    [
      title,
      String(request.body?.description || ''),
      JSON.stringify(readLabels(request)),
      position,
      dueDateFields.dueDate,
      dueDateFields.dueTime,
      dueDateFields.dueDateCompleted,
      dueDateFields.dueDateReminder,
      dueDateFields.dueDateRecurring,
      cover ? JSON.stringify(cover) : null
    ]
  );

  response.status(201).json({ inboxCard: mapInboxCard(result.rows[0]) });
}

// Updates an inbox card title, description, and selected labels.
async function updateInboxCard(request, response) {
  const title = readTitle(request);

  if (!title) {
    sendError(response, 400, 'Inbox card title is required.');
    return;
  }

  const dueDateFields = readDueDateFields(request);
  const cover = readCover(request);
  const result = await pool.query(
    `update inbox_cards set title = $1, description = $2, labels = $3::jsonb,
       due_date = $4, due_time = $5, due_date_completed = $6,
       due_date_reminder = $7, due_date_recurring = $8, cover = $9::jsonb,
       updated_at = now()
     where id = $10 and converted_card_id is null
     returning id, title, description, position, labels, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, converted_card_id`,
    [
      title,
      String(request.body?.description || ''),
      JSON.stringify(readLabels(request)),
      dueDateFields.dueDate,
      dueDateFields.dueTime,
      dueDateFields.dueDateCompleted,
      dueDateFields.dueDateReminder,
      dueDateFields.dueDateRecurring,
      cover ? JSON.stringify(cover) : null,
      request.params.inboxCardId
    ]
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

// Persists Inbox card ordering using the provided inbox card ids.
async function reorderInboxCards(request, response) {
  const { inboxCardIds = [] } = request.body || {};

  if (!Array.isArray(inboxCardIds)) {
    sendError(response, 400, 'Inbox card id array is required.');
    return;
  }

  for (const [index, inboxCardId] of inboxCardIds.entries()) {
    await pool.query(
      'update inbox_cards set position = $1, updated_at = now() where id = $2 and converted_card_id is null',
      [(index + 1) * 1000, inboxCardId]
    );
  }

  response.json({ ok: true });
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
      `select id, title, description, labels, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover
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
      `insert into cards (list_id, title, description, labels, position, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb)
       returning id, list_id, title, description, position, due_date, due_time, due_date_completed, due_date_reminder, due_date_recurring, cover, archived, labels`,
      [
        targetListId,
        inboxCard.title,
        inboxCard.description,
        JSON.stringify(Array.isArray(inboxCard.labels) ? inboxCard.labels : []),
        positionResult.rows[0].position,
        inboxCard.due_date,
        inboxCard.due_time || '',
        Boolean(inboxCard.due_date_completed),
        inboxCard.due_date_reminder || '1 Day before',
        inboxCard.due_date_recurring || 'Never',
        inboxCard.cover ? JSON.stringify(inboxCard.cover) : null
      ]
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
// Lists available labels for Inbox cards.
async function getInboxLabels(_request, response) {
  const result = await pool.query(
    `select id, name, color, position
     from inbox_labels
     order by position asc, created_at asc`
  );

  response.json({ labels: result.rows.map(mapInboxLabel) });
}

// Creates one available Inbox label with a unique color.
async function createInboxLabel(request, response) {
  const name = String(request.body?.name || '').trim();
  const color = String(request.body?.color || '').trim();

  if (!color) {
    sendError(response, 400, 'Label color is required.');
    return;
  }

  const positionResult = await pool.query('select coalesce(max(position), 0) + 1000 as position from inbox_labels');

  try {
    const result = await pool.query(
      `insert into inbox_labels (id, name, color, position)
       values ($1, $2, $3, $4)
       returning id, name, color, position`,
      [createLabelId(), name || 'New label', color, positionResult.rows[0].position]
    );

    response.status(201).json({ label: mapInboxLabel(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      sendError(response, 409, 'Label color is already used.');
      return;
    }

    throw error;
  }
}

// Renames one available Inbox label.
async function updateInboxLabel(request, response) {
  const name = String(request.body?.name || '').trim();

  const result = await pool.query(
    `update inbox_labels set name = $1, updated_at = now()
     where id = $2
     returning id, name, color, position`,
    [name, request.params.labelId]
  );

  if (result.rowCount === 0) {
    sendError(response, 404, 'Inbox label not found.');
    return;
  }

  response.json({ label: mapInboxLabel(result.rows[0]) });
}

inboxRouter.get('/inbox-labels', getInboxLabels);
inboxRouter.post('/inbox-labels', createInboxLabel);
inboxRouter.patch('/inbox-labels/:labelId', updateInboxLabel);
inboxRouter.get('/inbox-cards', getInboxCards);
inboxRouter.post('/inbox-cards', createInboxCard);
inboxRouter.patch('/inbox-cards/:inboxCardId', updateInboxCard);
inboxRouter.delete('/inbox-cards/:inboxCardId', deleteInboxCard);
inboxRouter.patch('/inbox-cards/reorder', reorderInboxCards);
inboxRouter.post('/inbox-cards/:inboxCardId/convert', convertInboxCard);
