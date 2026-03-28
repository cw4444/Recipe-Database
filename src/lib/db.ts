import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const globalForDatabase = globalThis as unknown as {
  db?: Database.Database;
};

function initialiseDatabase() {
  const dataDirectory = path.join(process.cwd(), "data");
  const databasePath = path.join(dataDirectory, "recipes.db");

  fs.mkdirSync(dataDirectory, { recursive: true });

  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");

  return db;
}

export const db = globalForDatabase.db ?? initialiseDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.db = db;
}
