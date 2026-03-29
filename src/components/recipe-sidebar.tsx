"use client";

import { useRouter } from "next/navigation";

import type { RecipeOption } from "@/lib/recipes";

type RecipeSidebarProps = {
  categories: string[];
  mainIngredients: string[];
  currentCategory: string;
  currentMainIngredient: string;
  currentRecipeSlug: string;
  recipes: RecipeOption[];
};

function buildPath(
  category: string,
  mainIngredient: string,
  recipe?: string,
  mode?: string,
) {
  const params = new URLSearchParams();

  if (category && category !== "All") {
    params.set("category", category);
  }

  if (mainIngredient && mainIngredient !== "All") {
    params.set("ingredient", mainIngredient);
  }

  if (recipe) {
    params.set("recipe", recipe);
  }

  if (mode) {
    params.set("mode", mode);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function RecipeSidebar({
  categories,
  mainIngredients,
  currentCategory,
  currentMainIngredient,
  currentRecipeSlug,
  recipes,
}: RecipeSidebarProps) {
  const router = useRouter();

  return (
    <aside className="panel sidebar-shell">
      <div className="panel-heading">
        <p className="eyebrow">Recipe List</p>
        <h2>Find recipes by category.</h2>
        <p className="muted">Pick a category, then choose a recipe to open.</p>
      </div>

      <label className="field">
        <span>Category</span>
        <select
          value={currentCategory}
          onChange={(event) => router.push(buildPath(event.target.value, currentMainIngredient))}
        >
          <option value="All">All</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Main Ingredient</span>
        <select
          value={currentMainIngredient}
          onChange={(event) => router.push(buildPath(currentCategory, event.target.value))}
        >
          <option value="All">All</option>
          {mainIngredients.map((mainIngredient) => (
            <option key={mainIngredient} value={mainIngredient}>
              {mainIngredient}
            </option>
          ))}
        </select>
      </label>

      <a
        className="primary-button sidebar-button"
        href={buildPath(currentCategory, currentMainIngredient, undefined, "new")}
      >
        Add recipe
      </a>

      <div className="recipe-nav-list">
        {recipes.length === 0 ? (
          <p className="muted">No recipes in this category yet.</p>
        ) : (
          recipes.map((recipe) => (
            <a
              key={recipe.id}
              className={`recipe-nav-item ${currentRecipeSlug === recipe.slug ? "recipe-nav-item-active" : ""}`}
              href={buildPath(currentCategory, currentMainIngredient, recipe.slug)}
            >
              <strong>{recipe.name}</strong>
              <span>
                {[recipe.category ?? "Unsorted", recipe.mainIngredient ?? "Any ingredient"].join(" · ")}
              </span>
            </a>
          ))
        )}
      </div>
    </aside>
  );
}
