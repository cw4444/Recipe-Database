import { RecipeCard } from "@/components/recipe-card";
import { RecipeForm } from "@/components/recipe-form";
import { RecipeSidebar } from "@/components/recipe-sidebar";
import {
  getCategories,
  getRecipeBySlug,
  getRecipeOptions,
  getRecipes,
} from "@/lib/recipes";

type SearchParams = Promise<{
  category?: string;
  recipe?: string;
  mode?: string;
}>;

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const [recipes, recipeOptions, categories] = await Promise.all([
    getRecipes(),
    getRecipeOptions(),
    getCategories(),
  ]);

  const currentCategory = searchParams.category?.trim() || "All";
  const filteredRecipes =
    currentCategory === "All"
      ? recipes
      : recipes.filter((recipe) => recipe.category === currentCategory);

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
            recipe: selectedRecipe.slug,
          }).filter(([, value]) => value),
        ),
      ).toString()}`
    : currentCategory !== "All"
      ? `/?category=${encodeURIComponent(currentCategory)}`
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
          currentCategory={currentCategory}
          currentRecipeSlug={selectedRecipe?.slug ?? ""}
          recipes={filteredRecipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            slug: recipe.slug,
            category: recipe.category,
          }))}
        />

        <div className="content-stack">
          {!showBlankNewForm && selectedRecipe ? (
            <RecipeCard recipe={selectedRecipe} categoryFilter={currentCategory} />
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
