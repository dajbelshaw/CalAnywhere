import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json } from "body-parser";
import { pagesRouter } from "./routes/pages";
import { initDatabase } from "./db/client";
import { runMigrations } from "./db/migrate";

const app = express();
const port = process.env.PORT || 4000;

app.set('trust proxy', 1);

// Basic security headers (CSP disabled — frontend is served separately)
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS: allow all in development, restrict via env in production
const allowedOrigin =
  process.env.ALLOWED_ORIGIN && process.env.ALLOWED_ORIGIN !== "*"
    ? process.env.ALLOWED_ORIGIN
    : "*";

app.use(
  cors({
    origin: allowedOrigin
  })
);

app.use(json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/pages", pagesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

async function start() {
  try {
    const hasDb = await initDatabase();
    if (hasDb) {
      await runMigrations();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Database initialisation failed:", err);
    // eslint-disable-next-line no-console
    console.log("Falling back to ephemeral in-memory mode.");
  }

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`CalAnywhere backend listening on port ${port}`);
  });
}

start();
