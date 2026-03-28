import { RecipeCard } from "@/components/recipe-card";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipeOptions, getRecipes } from "@/lib/recipes";

export default async function Home() {
  const [recipes, recipeOptions] = await Promise.all([getRecipes(), getRecipeOptions()]);
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return (
    <main className="page-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Recipe Graph</p>
          <h1>A proper recipe database for sauces, fillings, bases, and finished dishes.</h1>
          <p className="hero-copy">
            Store recipes as building blocks, then reuse them inside larger dishes without
            duplicating everything by hand.
          </p>
        </div>

        <div className="hero-stats">
          <div>
            <strong>{recipes.length}</strong>
            <span>recipes saved</span>
          </div>
          <div>
            <strong>{recipes.reduce((total, recipe) => total + recipe.ingredients.length, 0)}</strong>
            <span>ingredient rows</span>
          </div>
          <div>
            <strong>{recipes.reduce((total, recipe) => total + recipe._count.usedIn, 0)}</strong>
            <span>recipe links</span>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <RecipeForm recipeOptions={recipeOptions} />

        <section className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Recipe Library</p>
            <h2>Browse the graph.</h2>
            <p className="muted">
              Linked recipes are expanded inline so you can see how a finished dish depends on
              the smaller components beneath it.
            </p>
          </div>

          {recipes.length === 0 ? (
            <div className="empty-state">
              <h3>No recipes yet.</h3>
              <p>
                Add a base recipe first, then create a bigger dish that links back to it.
                Bechamel, ragu, pesto, pastry cream, and curry paste are all perfect starters.
              </p>
            </div>
          ) : (
            <div className="recipe-stack">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} recipeMap={recipeMap} />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
