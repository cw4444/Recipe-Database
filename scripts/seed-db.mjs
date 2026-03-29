import { randomUUID } from "node:crypto";
import path from "node:path";

import Database from "better-sqlite3";

const databasePath = path.join(process.cwd(), "data", "recipes.db");
const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

const hasRecipes =
  db.prepare("SELECT COUNT(*) AS count FROM recipes").get().count > 0;

if (hasRecipes) {
  console.log("Database already has recipes in it, so the sample data was skipped.");
  db.close();
  process.exit(0);
}

const insertRecipe = db.prepare(`
  INSERT INTO recipes (
    id,
    slug,
    name,
    category,
    main_ingredient,
    summary,
    instructions,
    servings,
    prep_minutes,
    cook_minutes
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertIngredient = db.prepare(`
  INSERT INTO recipe_ingredients (
    id,
    recipe_id,
    linked_recipe_id,
    label,
    quantity,
    unit,
    notes,
    sort_order
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const bechamelId = randomUUID();
const raguId = randomUUID();
const lasagneId = randomUUID();

db.transaction(() => {
  insertRecipe.run(
    bechamelId,
    "bechamel-sauce",
    "Bechamel Sauce",
    "Sauces",
    "Milk",
    "A creamy white sauce you can reuse in lasagne, pies, and gratins.",
    "Melt the butter in a saucepan.\nWhisk in the flour and cook for 1 minute.\nAdd the milk a little at a time, whisking well.\nCook until smooth and thick, then season with salt, pepper, and nutmeg.",
    4,
    5,
    10,
  );

  [
    ["Butter", "50", "g", "", null],
    ["Plain flour", "50", "g", "", null],
    ["Milk", "600", "ml", "Warm it first if you can.", null],
    ["Nutmeg", "1", "pinch", "", null],
  ].forEach(([label, quantity, unit, notes, linkedRecipeId], index) => {
    insertIngredient.run(
      randomUUID(),
      bechamelId,
      linkedRecipeId,
      label,
      quantity,
      unit,
      notes || null,
      index,
    );
  });

  insertRecipe.run(
    raguId,
    "ragu",
    "Ragu",
    "Italian",
    "Beef",
    "A slow-cooked meat sauce for pasta bakes and lasagne.",
    "Soften the onion, carrot, and celery in oil.\nAdd the mince and cook until browned.\nStir in tomato puree, chopped tomatoes, and seasoning.\nSimmer gently until rich and thick.",
    6,
    15,
    90,
  );

  [
    ["Olive oil", "2", "tbsp", "", null],
    ["Onion", "1", "", "Finely chopped", null],
    ["Carrot", "1", "", "Finely chopped", null],
    ["Celery stick", "1", "", "Finely chopped", null],
    ["Beef mince", "500", "g", "", null],
    ["Chopped tomatoes", "2", "tins", "", null],
    ["Tomato puree", "2", "tbsp", "", null],
  ].forEach(([label, quantity, unit, notes, linkedRecipeId], index) => {
    insertIngredient.run(
      randomUUID(),
      raguId,
      linkedRecipeId,
      label,
      quantity,
      unit,
      notes || null,
      index,
    );
  });

  insertRecipe.run(
    lasagneId,
    "lasagne",
    "Lasagne",
    "Italian",
    "Pasta",
    "An example of a recipe that is made from other recipes.",
    "Make the ragu and bechamel first.\nLayer ragu, pasta sheets, and bechamel in a baking dish.\nRepeat the layers and finish with cheese.\nBake until bubbling and golden.",
    6,
    30,
    45,
  );

  [
    ["Ragu", "1", "batch", "Use the prepared ragu recipe.", raguId],
    ["Bechamel sauce", "1", "batch", "Use the prepared bechamel recipe.", bechamelId],
    ["Lasagne sheets", "12", "", "", null],
    ["Cheddar or mozzarella", "150", "g", "For the top", null],
  ].forEach(([label, quantity, unit, notes, linkedRecipeId], index) => {
    insertIngredient.run(
      randomUUID(),
      lasagneId,
      linkedRecipeId,
      label,
      quantity,
      unit,
      notes || null,
      index,
    );
  });
})();

db.close();

console.log("Sample recipes added: Bechamel Sauce, Ragu, and Lasagne.");
