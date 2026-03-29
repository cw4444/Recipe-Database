import { PantryPanel } from "@/components/pantry-panel";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeForm } from "@/components/recipe-form";
import { RecipeSidebar } from "@/components/recipe-sidebar";
import { getStockItems } from "@/lib/pantry";
import {
  getCategories,
  getMainIngredients,
  getRecipeBySlug,
  getRecipeOptions,
  getRecipes,
} from "@/lib/recipes";

type SearchParams = Promise<{
  category?: string;
  ingredient?: string;
  recipe?: string;
  mode?: string;
}>;

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const [recipes, recipeOptions, categories, mainIngredients, stockItems] = await Promise.all([
    getRecipes(),
    getRecipeOptions(),
    getCategories(),
    getMainIngredients(),
    getStockItems(),
  ]);

  const currentCategory = searchParams.category?.trim() || "All";
  const currentMainIngredient = searchParams.ingredient?.trim() || "All";
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesCategory =
      currentCategory === "All" || recipe.category === currentCategory;
    const matchesIngredient =
      currentMainIngredient === "All" || recipe.mainIngredient === currentMainIngredient;

    return matchesCategory && matchesIngredient;
  });

  const requestedRecipeSlug = searchParams.recipe?.trim() || "";
  const selectedRecipe =
    filteredRecipes.find((recipe) => recipe.slug === requestedRecipeSlug) ??
    filteredRecipes[0] ??
    null;

  const mode = searchParams.mode === "edit" ? "edit" : searchParams.mode === "new" ? "new" : "";
  const recipeToEdit = mode === "edit" && requestedRecipeSlug ? getRecipeBySlug(requestedRecipeSlug) : null;
  const showBlankNewForm = mode === "new";
  const cancelHref = selectedRecipe
    ? `/?${new URLSearchParams(
        Object.fromEntries(
          Object.entries({
            category: currentCategory !== "All" ? currentCategory : "",
            ingredient: currentMainIngredient !== "All" ? currentMainIngredient : "",
            recipe: selectedRecipe.slug,
          }).filter(([, value]) => value),
        ),
      ).toString()}`
    : currentCategory !== "All" || currentMainIngredient !== "All"
      ? `/?${new URLSearchParams(
          Object.fromEntries(
            Object.entries({
              category: currentCategory !== "All" ? currentCategory : "",
              ingredient: currentMainIngredient !== "All" ? currentMainIngredient : "",
            }).filter(([, value]) => value),
          ),
        ).toString()}`
      : "/";

  return (
    <main className="page-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Recipe Graph</p>
          <h1>A recipe database with proper categories and reusable sub-recipes.</h1>
          <p className="hero-copy">
            Browse by category on the left, open one recipe at a time, and link smaller
            recipes into larger dishes without duplicating everything.
          </p>
        </div>

        <div className="hero-stats">
          <div>
            <strong>{recipes.length}</strong>
            <span>recipes saved</span>
          </div>
          <div>
            <strong>{categories.length}</strong>
            <span>categories</span>
          </div>
          <div>
            <strong>{recipes.reduce((total, recipe) => total + recipe._count.usedIn, 0)}</strong>
            <span>recipe links</span>
          </div>
        </div>
      </section>

      <section className="app-grid">
        <RecipeSidebar
          categories={categories}
          mainIngredients={mainIngredients}
          currentCategory={currentCategory}
          currentMainIngredient={currentMainIngredient}
          currentRecipeSlug={selectedRecipe?.slug ?? ""}
          recipes={filteredRecipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            category: recipe.category,
            mainIngredient: recipe.mainIngredient,
          }))}
        />

        <div className="content-stack">
          <PantryPanel stockItems={stockItems} />

          {!showBlankNewForm && selectedRecipe ? (
            <RecipeCard
              recipe={selectedRecipe}
              categoryFilter={currentCategory}
              ingredientFilter={currentMainIngredient}
            />
          ) : null}

          {!showBlankNewForm && !selectedRecipe ? (
            <section className="panel empty-state">
              <h2>No recipe selected.</h2>
              <p>
                Pick one from the list on the left, or add a new one to get started.
              </p>
            </section>
          ) : null}

          {mode === "new" || recipeToEdit ? (
            <RecipeForm
              key={recipeToEdit ? `edit-${recipeToEdit.id}` : `new-${currentCategory}`}
              recipeOptions={recipeOptions}
              categories={categories}
              mainIngredients={mainIngredients}
              initialRecipe={recipeToEdit}
              selectedCategory={currentCategory !== "All" ? currentCategory : ""}
              cancelHref={cancelHref}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
