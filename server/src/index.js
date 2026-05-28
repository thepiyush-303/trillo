import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

// Starts the HTTP server for the API.
function startServer() {
  app.listen(env.port, () => {
    console.log(`API server listening on http://localhost:${env.port}`);
  });
}

startServer();