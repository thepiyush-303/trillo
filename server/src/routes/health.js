import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

// Checks that the API process is running and the database is reachable.
async function getHealth(_request, response) {
  const result = await pool.query('select now() as checked_at');

  response.json({
    status: 'ok',
    database: 'connected',
    checkedAt: result.rows[0].checked_at
  });
}

healthRouter.get('/health', getHealth);