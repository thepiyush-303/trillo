import { Router } from 'express';
import { pool } from '../db/pool.js';

export const userRouter = Router();

async function usersData(request, response) {
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



userRouter.post('/users', usersData)