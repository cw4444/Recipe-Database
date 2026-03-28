import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "recipes.db");

fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    summary TEXT,
    instructions TEXT NOT NULL,
    servings INTEGER,
    prep_minutes INTEGER,
    cook_minutes INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    linked_recipe_id TEXT,
    label TEXT NOT NULL,
    quantity TEXT,
    unit TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_sort
    ON recipe_ingredients (recipe_id, sort_order);

  CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_linked_recipe
    ON recipe_ingredients (linked_recipe_id);

  CREATE TRIGGER IF NOT EXISTS recipes_set_updated_at
  AFTER UPDATE ON recipes
  FOR EACH ROW
  BEGIN
    UPDATE recipes SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  END;
`);

db.close();

console.log(`Database ready at ${databasePath}`);
