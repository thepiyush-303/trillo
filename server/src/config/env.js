import dotenv from "dotenv";

dotenv.config();

function parseCsv(value, fallback) {
  const values = value
    ?.split(",")
    .map((item) => {
      let url = item.trim();
      return url.endsWith("/") ? url.slice(0, -1) : url;
    })
    .filter(Boolean);

  return values?.length ? values : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/trello_kanban",
  databaseSsl: process.env.DATABASE_SSL === "true",
  clientUrls: parseCsv(
    process.env.CLIENT_URLS || process.env.CLIENT_URL,
    ["http://localhost:5173"]
  )
};