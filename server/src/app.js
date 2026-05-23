import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { boardsRouter } from "./routes/boards.js";
import { inboxRouter } from "./routes/inbox.js";

function isAllowedOrigin(origin) {
  return !origin || env.clientUrls.includes(origin);
}

// Creates and configures the Express application.
export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      }
    })
  );
  app.use(express.json());
  app.use("/api", healthRouter);
  app.use("/api", boardsRouter);
  app.use("/api", inboxRouter);

  return app;
}
