import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { getRecipes, type RecipeWithIngredients } from "@/lib/recipes";

type StockItemRow = {
  id: string;
  name: string;
  unit: string | null;
  on_hand: number;
  low_stock_threshold: number;
  updated_at: string;
};

export type StockItem = {
  id: string;
  name: string;
  unit: string | null;
  onHand: number;
  lowStockThreshold: number;
  updatedAt: string;
  isLowStock: boolean;
};

type StockInput = {
  name: string;
  unit?: string;
  amount: number;
  lowStockThreshold?: number;
};

type ConsumptionSummary = {
  consumedCount: number;
  unmatched: string[];
  lowStock: string[];
};

function normaliseName(value: string) {
  return value.trim().toLowerCase();
}

function normaliseUnit(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function parseNumericQuantity(value?: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getStockItems(): StockItem[] {
  const rows = db
    .prepare(
      `
        SELECT id, name, unit, on_hand, low_stock_threshold, updated_at
        FROM stock_items
        ORDER BY
          CASE WHEN on_hand <= low_stock_threshold THEN 0 ELSE 1 END,
          name COLLATE NOCASE ASC
      `,
    )
    .all() as StockItemRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    onHand: row.on_hand,
    lowStockThreshold: row.low_stock_threshold,
    updatedAt: row.updated_at,
    isLowStock: row.on_hand <= row.low_stock_threshold,
  }));
}

export function addOrRestockStockItem(input: StockInput) {
  const existing = db
    .prepare(
      `
        SELECT id, on_hand, low_stock_threshold
        FROM stock_items
        WHERE lower(name) = lower(?)
          AND lower(COALESCE(unit, '')) = lower(?)
        LIMIT 1
      `,
    )
    .get(input.name.trim(), normaliseUnit(input.unit)) as
    | { id: string; on_hand: number; low_stock_threshold: number }
    | undefined;

  if (existing) {
    db.prepare(
      `
        UPDATE stock_items
        SET on_hand = ?, low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    ).run(
      existing.on_hand + input.amount,
      input.lowStockThreshold ?? existing.low_stock_threshold,
      existing.id,
    );

    return existing.id;
  }

  const id = randomUUID();

  db.prepare(
    `
      INSERT INTO stock_items (
        id,
        name,
        unit,
        on_hand,
        low_stock_threshold
      )
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    input.name.trim(),
    input.unit?.trim() || null,
    input.amount,
    input.lowStockThreshold ?? 0,
  );

  return id;
}

function accumulateRecipeIngredients(
  recipe: RecipeWithIngredients,
  recipeMap: Map<string, RecipeWithIngredients>,
  multiplier: number,
  trail: string[],
  totals: Map<string, { name: string; unit: string | null; amount: number }>,
  unmatched: Set<string>,
) {
  const nextTrail = [...trail, recipe.id];

  for (const ingredient of recipe.ingredients) {
    const quantity = parseNumericQuantity(ingredient.quantity);

    if (ingredient.linkedRecipeId) {
      const linkedRecipe = recipeMap.get(ingredient.linkedRecipeId);

      if (!linkedRecipe || nextTrail.includes(linkedRecipe.id)) {
        unmatched.add(ingredient.label);
        continue;
      }

      accumulateRecipeIngredients(
        linkedRecipe,
        recipeMap,
        multiplier * (quantity ?? 1),
        nextTrail,
        totals,
        unmatched,
      );
      continue;
    }

    if (quantity === null) {
      unmatched.add(ingredient.label);
      continue;
    }

    const key = `${normaliseName(ingredient.label)}::${normaliseUnit(ingredient.unit)}`;
    const current = totals.get(key);

    if (current) {
      current.amount += quantity * multiplier;
      continue;
    }

    totals.set(key, {
      name: ingredient.label,
      unit: ingredient.unit,
      amount: quantity * multiplier,
    });
  }
}

export function consumeRecipeStock(recipeId: string): ConsumptionSummary {
  const recipes = getRecipes();
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const recipe = recipeMap.get(recipeId);

  if (!recipe) {
    throw new Error("Recipe not found.");
  }

  const totals = new Map<string, { name: string; unit: string | null; amount: number }>();
  const unmatched = new Set<string>();

  accumulateRecipeIngredients(recipe, recipeMap, 1, [], totals, unmatched);

  const updateStock = db.prepare(
    `
      UPDATE stock_items
      SET on_hand = on_hand - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  );

  const findStock = db.prepare(
    `
      SELECT id, name, on_hand, low_stock_threshold
      FROM stock_items
      WHERE lower(name) = lower(?)
        AND lower(COALESCE(unit, '')) = lower(?)
      LIMIT 1
    `,
  );

  const lowStock = new Set<string>();
  let consumedCount = 0;

  const transaction = db.transaction(() => {
    for (const requirement of totals.values()) {
      const stockItem = findStock.get(
        requirement.name,
        normaliseUnit(requirement.unit),
      ) as
        | { id: string; name: string; on_hand: number; low_stock_threshold: number }
        | undefined;

      if (!stockItem) {
        unmatched.add(requirement.name);
        continue;
      }

      const nextOnHand = stockItem.on_hand - requirement.amount;
      updateStock.run(requirement.amount, stockItem.id);
      consumedCount += 1;

      if (nextOnHand <= stockItem.low_stock_threshold) {
        lowStock.add(stockItem.name);
      }
    }
  });

  transaction();

  return {
    consumedCount,
    unmatched: Array.from(unmatched),
    lowStock: Array.from(lowStock),
  };
}
