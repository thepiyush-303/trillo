import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { boardsRouter } from './routes/boards.js';
import { inboxRouter } from './routes/inbox.js';

// Creates and configures the Express application.
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl
    })
  );
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api', boardsRouter);
  app.use('/api', inboxRouter);

  return app;
}

