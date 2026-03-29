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
    category TEXT,
    main_ingredient TEXT,
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

  CREATE TABLE IF NOT EXISTS stock_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    on_hand REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_stock_items_name_unit
    ON stock_items (name, unit);

  CREATE TRIGGER IF NOT EXISTS recipes_set_updated_at
  AFTER UPDATE ON recipes
  FOR EACH ROW
  BEGIN
    UPDATE recipes SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  END;

  CREATE TRIGGER IF NOT EXISTS stock_items_set_updated_at
  AFTER UPDATE ON stock_items
  FOR EACH ROW
  BEGIN
    UPDATE stock_items SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  END;
`);

const recipeColumns = db.prepare("PRAGMA table_info(recipes)").all();
const hasCategory = recipeColumns.some((column) => column.name === "category");
const hasMainIngredient = recipeColumns.some((column) => column.name === "main_ingredient");

if (!hasCategory) {
  db.exec("ALTER TABLE recipes ADD COLUMN category TEXT");
}

if (!hasMainIngredient) {
  db.exec("ALTER TABLE recipes ADD COLUMN main_ingredient TEXT");
}

db.close();

console.log(`Database ready at ${databasePath}`);
