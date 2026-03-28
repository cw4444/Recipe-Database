import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

type RecipeRow = {
  id: string;
  slug: string;
  name: string;
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
};

export type IngredientInput = {
  label: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  linkedRecipeId?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
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

export function getRecipeOptions(): RecipeOption[] {
  return db
    .prepare(
      `
        SELECT id, name, slug
        FROM recipes
        ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all() as RecipeOption[];
}

export function linkedRecipesExist(ids: string[]) {
  if (ids.length === 0) {
    return true;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT id FROM recipes WHERE id IN (${placeholders})`)
    .all(...ids) as Array<{ id: string }>;

  return rows.length === new Set(ids).size;
}

export function createRecipe(input: {
  name: string;
  summary?: string;
  instructions: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients: IngredientInput[];
}) {
  const base = slugify(input.name) || "recipe";
  let slug = base;
  let suffix = 1;

  while (db.prepare("SELECT id FROM recipes WHERE slug = ? LIMIT 1").get(slug) !== undefined) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  const linkedRecipeIds = input.ingredients
    .map((ingredient) => ingredient.linkedRecipeId)
    .filter((value): value is string => Boolean(value));

  const linkedRecipeRows =
    linkedRecipeIds.length > 0
      ? (db
          .prepare(
            `SELECT id, name FROM recipes WHERE id IN (${linkedRecipeIds
              .map(() => "?")
              .join(", ")})`,
          )
          .all(...linkedRecipeIds) as Array<{ id: string; name: string }>)
      : [];

  const linkedRecipeNames = new Map(linkedRecipeRows.map((recipe) => [recipe.id, recipe.name]));
  const recipeId = randomUUID();

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (id, slug, name, summary, instructions, servings, prep_minutes, cook_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

  return recipeId;
}
