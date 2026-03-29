"use server";

import { revalidatePath } from "next/cache";

import {
  addOrRestockStockItem,
  consumeRecipeStock,
} from "@/lib/pantry";
import {
  createRecipe,
  deleteRecipe,
  linkedRecipesExist,
  updateRecipe,
  type IngredientInput,
} from "@/lib/recipes";

export type RecipeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  revision: number;
  redirectTo?: string;
};

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildRecipePath(slug: string, category?: string, mainIngredient?: string) {
  const params = new URLSearchParams();
  params.set("recipe", slug);

  if (category?.trim()) {
    params.set("category", category.trim());
  }

  if (mainIngredient?.trim()) {
    params.set("ingredient", mainIngredient.trim());
  }

  return `/?${params.toString()}`;
}

export async function submitRecipeAction(formData: FormData): Promise<RecipeActionState> {
  try {
    const recipeId = formData.get("recipeId");
    const name = formData.get("name");
    const category = formData.get("category");
    const mainIngredient = formData.get("mainIngredient");
    const summary = formData.get("summary");
    const instructions = formData.get("instructions");
    const ingredientsJson = formData.get("ingredients");

    if (typeof name !== "string" || name.trim().length < 2) {
      return {
        status: "error",
        message: "Recipe name needs at least 2 characters.",
        revision: Date.now(),
      };
    }

    if (typeof instructions !== "string" || instructions.trim().length < 10) {
      return {
        status: "error",
        message: "Instructions should have enough detail to be useful.",
        revision: Date.now(),
      };
    }

    if (typeof ingredientsJson !== "string") {
      return {
        status: "error",
        message: "Ingredient rows were missing from the form submission.",
        revision: Date.now(),
      };
    }

    let ingredients: IngredientInput[] = [];

    try {
      ingredients = JSON.parse(ingredientsJson) as IngredientInput[];
    } catch {
      return {
        status: "error",
        message: "Ingredient rows could not be read.",
        revision: Date.now(),
      };
    }

    const cleanedIngredients = ingredients
      .map((ingredient) => ({
        label: ingredient.label.trim(),
        quantity: ingredient.quantity?.trim() || undefined,
        unit: ingredient.unit?.trim() || undefined,
        notes: ingredient.notes?.trim() || undefined,
        linkedRecipeId: ingredient.linkedRecipeId?.trim() || undefined,
      }))
      .filter((ingredient) => ingredient.label.length > 0 || ingredient.linkedRecipeId);

    if (cleanedIngredients.length === 0) {
      return {
        status: "error",
        message: "Add at least one ingredient or linked sub-recipe.",
        revision: Date.now(),
      };
    }

    const linkedRecipeIds = cleanedIngredients
      .map((ingredient) => ingredient.linkedRecipeId)
      .filter((value): value is string => Boolean(value));

    const resolvedRecipeId = typeof recipeId === "string" && recipeId.trim() ? recipeId : undefined;

    if (!linkedRecipesExist(linkedRecipeIds, resolvedRecipeId)) {
      return {
        status: "error",
        message: "A recipe cannot link to itself, and every linked recipe must exist.",
        revision: Date.now(),
      };
    }

    const input = {
      name: name.trim(),
      category: typeof category === "string" ? category.trim() : undefined,
      mainIngredient:
        typeof mainIngredient === "string" ? mainIngredient.trim() : undefined,
      summary: typeof summary === "string" && summary.trim() ? summary.trim() : undefined,
      instructions: instructions.trim(),
      servings: parseOptionalNumber(formData.get("servings")),
      prepMinutes: parseOptionalNumber(formData.get("prepMinutes")),
      cookMinutes: parseOptionalNumber(formData.get("cookMinutes")),
      ingredients: cleanedIngredients,
    };

    const saved = resolvedRecipeId
      ? updateRecipe({ id: resolvedRecipeId, ...input })
      : createRecipe(input);

    revalidatePath("/");

    return {
      status: "success",
      message: resolvedRecipeId ? "Recipe updated." : "Recipe saved.",
      revision: Date.now(),
      redirectTo: buildRecipePath(saved.slug, input.category, input.mainIngredient),
    };
  } catch {
    return {
      status: "error",
      message: "Something went wrong while saving the recipe.",
      revision: Date.now(),
    };
  }
}

export async function deleteRecipeAction(
  recipeId: string,
  category?: string,
  mainIngredient?: string,
) {
  const deleted = deleteRecipe(recipeId);

  const params = new URLSearchParams();

  if (category?.trim()) {
    params.set("category", category.trim());
  }

  if (mainIngredient?.trim()) {
    params.set("ingredient", mainIngredient.trim());
  }

  const redirectTo = params.toString() ? `/?${params.toString()}` : "/";

  revalidatePath("/");

  if (!deleted) {
    return {
      status: "error" as const,
      message: "That recipe could not be found.",
      redirectTo,
    };
  }

    return {
      status: "success" as const,
      message: "Recipe deleted.",
      redirectTo,
    };
}

export async function addStockItemAction(formData: FormData) {
  const name = formData.get("stockName");
  const unit = formData.get("stockUnit");
  const amount = parseOptionalNumber(formData.get("stockAmount"));
  const lowStockThreshold = parseOptionalNumber(formData.get("lowStockThreshold"));

  if (typeof name !== "string" || name.trim().length < 2) {
    return {
      status: "error" as const,
      message: "Stock item name needs at least 2 characters.",
    };
  }

  if (amount === undefined || amount <= 0) {
    return {
      status: "error" as const,
      message: "Enter a stock amount greater than 0.",
    };
  }

  addOrRestockStockItem({
    name: name.trim(),
    unit: typeof unit === "string" ? unit.trim() : undefined,
    amount,
    lowStockThreshold,
  });

  revalidatePath("/");

  return {
    status: "success" as const,
    message: "Stock updated.",
  };
}

export async function makeRecipeAction(recipeId: string) {
  try {
    const result = consumeRecipeStock(recipeId);
    revalidatePath("/");

    const summaryParts = [`Updated ${result.consumedCount} stock item(s).`];

    if (result.lowStock.length > 0) {
      summaryParts.push(`Running low: ${result.lowStock.join(", ")}.`);
    }

    if (result.unmatched.length > 0) {
      summaryParts.push(
        `Could not deduct: ${result.unmatched.slice(0, 4).join(", ")}${result.unmatched.length > 4 ? "..." : ""}.`,
      );
    }

    return {
      status: "success" as const,
      message: summaryParts.join(" "),
    };
  } catch {
    return {
      status: "error" as const,
      message: "Could not update stock for that recipe.",
    };
  }
}
