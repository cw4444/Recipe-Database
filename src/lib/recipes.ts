import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

export const CATEGORY_OPTIONS = [
  "Italian",
  "Indian",
  "Biscuits",
  "Stews",
  "Cake",
  "Sauces",
  "Soups",
  "Pasta",
  "Baking",
  "Desserts",
  "Vegetarian",
  "Basics",
] as const;

type RecipeRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  summary: string | null;
  instructions: string;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  used_in_count: number;
};

type IngredientRow = {
  id: string;
  recipe_id: string;
  linked_recipe_id: string | null;
  label: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  sort_order: number;
  linked_recipe_name: string | null;
  linked_recipe_slug: string | null;
  linked_recipe_summary: string | null;
};

export type RecipeWithIngredients = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  summary: string | null;
  instructions: string;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: Array<{
    id: string;
    label: string;
    quantity: string | null;
    unit: string | null;
    notes: string | null;
    linkedRecipeId: string | null;
    sortOrder: number;
    linkedRecipe: {
      id: string;
      name: string;
      slug: string;
      summary: string | null;
    } | null;
  }>;
  _count: {
    ingredients: number;
    usedIn: number;
  };
};

export type RecipeOption = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};

export type IngredientInput = {
  label: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  linkedRecipeId?: string;
};

export type RecipeInput = {
  id?: string;
  name: string;
  category?: string;
  summary?: string;
  instructions: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients: IngredientInput[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function normaliseCategory(category?: string | null) {
  const cleaned = category?.trim();
  return cleaned ? cleaned : null;
}

function mapRecipes(recipes: RecipeRow[], ingredients: IngredientRow[]) {
  const ingredientMap = new Map<string, RecipeWithIngredients["ingredients"]>();

  for (const ingredient of ingredients) {
    const recipeIngredients = ingredientMap.get(ingredient.recipe_id) ?? [];

    recipeIngredients.push({
      id: ingredient.id,
      label: ingredient.label,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      notes: ingredient.notes,
      linkedRecipeId: ingredient.linked_recipe_id,
      sortOrder: ingredient.sort_order,
      linkedRecipe: ingredient.linked_recipe_id
        ? {
            id: ingredient.linked_recipe_id,
            name: ingredient.linked_recipe_name ?? "Linked recipe",
            slug: ingredient.linked_recipe_slug ?? "",
            summary: ingredient.linked_recipe_summary,
          }
        : null,
    });

    ingredientMap.set(ingredient.recipe_id, recipeIngredients);
  }

  return recipes.map((recipe) => ({
    id: recipe.id,
    slug: recipe.slug,
    name: recipe.name,
    category: recipe.category,
    summary: recipe.summary,
    instructions: recipe.instructions,
    servings: recipe.servings,
    prepMinutes: recipe.prep_minutes,
    cookMinutes: recipe.cook_minutes,
    ingredients: ingredientMap.get(recipe.id) ?? [],
    _count: {
      ingredients: ingredientMap.get(recipe.id)?.length ?? 0,
      usedIn: recipe.used_in_count,
    },
  }));
}

export function getRecipes(): RecipeWithIngredients[] {
  const recipes = db
    .prepare(
      `
        SELECT
          r.*,
          (
            SELECT COUNT(*)
            FROM recipe_ingredients ri
            WHERE ri.linked_recipe_id = r.id
          ) AS used_in_count
        FROM recipes r
        ORDER BY r.name COLLATE NOCASE ASC
      `,
    )
    .all() as RecipeRow[];

  const ingredients = db
    .prepare(
      `
        SELECT
          ri.*,
          linked.name AS linked_recipe_name,
          linked.slug AS linked_recipe_slug,
          linked.summary AS linked_recipe_summary
        FROM recipe_ingredients ri
        LEFT JOIN recipes linked ON linked.id = ri.linked_recipe_id
        ORDER BY ri.recipe_id, ri.sort_order ASC
      `,
    )
    .all() as IngredientRow[];

  return mapRecipes(recipes, ingredients);
}

export function getRecipeBySlug(slug: string) {
  return getRecipes().find((recipe) => recipe.slug === slug) ?? null;
}

export function getRecipeOptions(): RecipeOption[] {
  return db
    .prepare(
      `
        SELECT id, name, slug, category
        FROM recipes
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all() as RecipeOption[];
}

export function getCategories() {
  const categoryRows = db
    .prepare(
      `
        SELECT DISTINCT category
        FROM recipes
        WHERE category IS NOT NULL AND TRIM(category) <> ''
        ORDER BY category COLLATE NOCASE ASC
      `,
    )
    .all() as Array<{ category: string }>;

  const stored = categoryRows.map((row) => row.category);

  return Array.from(new Set([...CATEGORY_OPTIONS, ...stored]));
}

export function linkedRecipesExist(ids: string[], excludeRecipeId?: string) {
  if (ids.length === 0) {
    return true;
  }

  if (excludeRecipeId && ids.includes(excludeRecipeId)) {
    return false;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT id FROM recipes WHERE id IN (${placeholders})`)
    .all(...ids) as Array<{ id: string }>;

  return rows.length === new Set(ids).size;
}

function getUniqueSlug(name: string, excludeRecipeId?: string) {
  const base = slugify(name) || "recipe";
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = db
      .prepare("SELECT id FROM recipes WHERE slug = ? LIMIT 1")
      .get(slug) as { id: string } | undefined;

    if (!existing || existing.id === excludeRecipeId) {
      return slug;
    }

    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

function getLinkedRecipeNames(linkedRecipeIds: string[]) {
  if (linkedRecipeIds.length === 0) {
    return new Map<string, string>();
  }

  const linkedRecipeRows = db
    .prepare(
      `SELECT id, name FROM recipes WHERE id IN (${linkedRecipeIds.map(() => "?").join(", ")})`,
    )
    .all(...linkedRecipeIds) as Array<{ id: string; name: string }>;

  return new Map(linkedRecipeRows.map((recipe) => [recipe.id, recipe.name]));
}

export function createRecipe(input: RecipeInput) {
  const slug = getUniqueSlug(input.name);
  const recipeId = randomUUID();
  const linkedRecipeIds = input.ingredients
    .map((ingredient) => ingredient.linkedRecipeId)
    .filter((value): value is string => Boolean(value));
  const linkedRecipeNames = getLinkedRecipeNames(linkedRecipeIds);

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (
      id,
      slug,
      name,
      category,
      summary,
      instructions,
      servings,
      prep_minutes,
      cook_minutes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  const transaction = db.transaction(() => {
    insertRecipe.run(
      recipeId,
      slug,
      input.name,
      normaliseCategory(input.category),
      input.summary ?? null,
      input.instructions,
      input.servings ?? null,
      input.prepMinutes ?? null,
      input.cookMinutes ?? null,
    );

    input.ingredients.forEach((ingredient, index) => {
      insertIngredient.run(
        randomUUID(),
        recipeId,
        ingredient.linkedRecipeId ?? null,
        ingredient.label ||
          (ingredient.linkedRecipeId
            ? linkedRecipeNames.get(ingredient.linkedRecipeId) ?? "Linked recipe"
            : "Ingredient"),
        ingredient.quantity ?? null,
        ingredient.unit ?? null,
        ingredient.notes ?? null,
        index,
      );
    });
  });

  transaction();

  return { id: recipeId, slug };
}

export function updateRecipe(input: RecipeInput & { id: string }) {
  const existing = db
    .prepare("SELECT id FROM recipes WHERE id = ? LIMIT 1")
    .get(input.id) as { id: string } | undefined;

  if (!existing) {
    throw new Error("Recipe not found.");
  }

  const slug = getUniqueSlug(input.name, input.id);
  const linkedRecipeIds = input.ingredients
    .map((ingredient) => ingredient.linkedRecipeId)
    .filter((value): value is string => Boolean(value));
  const linkedRecipeNames = getLinkedRecipeNames(linkedRecipeIds);

  const updateRecipeStatement = db.prepare(`
    UPDATE recipes
    SET slug = ?, name = ?, category = ?, summary = ?, instructions = ?,
        servings = ?, prep_minutes = ?, cook_minutes = ?
    WHERE id = ?
  `);

  const deleteIngredients = db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?");

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

  const transaction = db.transaction(() => {
    updateRecipeStatement.run(
      slug,
      input.name,
      normaliseCategory(input.category),
      input.summary ?? null,
      input.instructions,
      input.servings ?? null,
      input.prepMinutes ?? null,
      input.cookMinutes ?? null,
      input.id,
    );

    deleteIngredients.run(input.id);

    input.ingredients.forEach((ingredient, index) => {
      insertIngredient.run(
        randomUUID(),
        input.id,
        ingredient.linkedRecipeId ?? null,
        ingredient.label ||
          (ingredient.linkedRecipeId
            ? linkedRecipeNames.get(ingredient.linkedRecipeId) ?? "Linked recipe"
            : "Ingredient"),
        ingredient.quantity ?? null,
        ingredient.unit ?? null,
        ingredient.notes ?? null,
        index,
      );
    });
  });

  transaction();

  return { id: input.id, slug };
}

export function deleteRecipe(recipeId: string) {
  const existing = db
    .prepare("SELECT id, slug, category FROM recipes WHERE id = ? LIMIT 1")
    .get(recipeId) as { id: string; slug: string; category: string | null } | undefined;

  if (!existing) {
    return null;
  }

  db.prepare("DELETE FROM recipes WHERE id = ?").run(recipeId);
  return existing;
}
