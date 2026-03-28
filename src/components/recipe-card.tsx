import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import type { RecipeWithIngredients } from "@/lib/recipes";

type RecipeCardProps = {
  recipe: RecipeWithIngredients;
  categoryFilter: string;
};

function formatMeta(label: string, value?: number | null) {
  if (!value) {
    return null;
  }

  return `${value} ${label}`;
}

function buildPath(recipeSlug: string, categoryFilter: string, mode?: string) {
  const params = new URLSearchParams();

  if (categoryFilter && categoryFilter !== "All") {
    params.set("category", categoryFilter);
  }

  params.set("recipe", recipeSlug);

  if (mode) {
    params.set("mode", mode);
  }

  return `/?${params.toString()}`;
}

export function RecipeCard({ recipe, categoryFilter }: RecipeCardProps) {
  return (
    <article className="panel recipe-detail-card" id={recipe.slug}>
      <div className="recipe-header">
        <div>
          <p className="eyebrow">{recipe.category ?? "Unsorted recipe"}</p>
          <h2>{recipe.name}</h2>
          {recipe.summary ? <p className="muted">{recipe.summary}</p> : null}
        </div>

        <div className="meta-cluster">
          {formatMeta("servings", recipe.servings) ? (
            <span>{formatMeta("servings", recipe.servings)}</span>
          ) : null}
          {formatMeta("min prep", recipe.prepMinutes) ? (
            <span>{formatMeta("min prep", recipe.prepMinutes)}</span>
          ) : null}
          {formatMeta("min cook", recipe.cookMinutes) ? (
            <span>{formatMeta("min cook", recipe.cookMinutes)}</span>
          ) : null}
          <span>{recipe._count.usedIn} parent recipe(s)</span>
        </div>
      </div>

      <div className="recipe-toolbar">
        <a className="secondary-button toolbar-link" href={`/?mode=new`}>
          Add another recipe
        </a>
        <a
          className="secondary-button toolbar-link"
          href={buildPath(recipe.slug, categoryFilter, "edit")}
        >
          Edit recipe
        </a>
        <DeleteRecipeButton recipeId={recipe.id} category={categoryFilter} />
      </div>

      <div className="recipe-body">
        <section>
          <h3>Ingredients</h3>
          <ul className="ingredient-output">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                <div>
                  <strong>{ingredient.label}</strong>
                  <span className="muted">
                    {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}
                  </span>
                </div>
                {ingredient.notes ? <p className="muted">{ingredient.notes}</p> : null}
                {ingredient.linkedRecipe ? (
                  <p className="linked-recipe-note">
                    Sub-recipe:{" "}
                    <a href={buildPath(ingredient.linkedRecipe.slug, categoryFilter)}>
                      {ingredient.linkedRecipe.name}
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Method</h3>
          <div className="instructions">
            {recipe.instructions.split(/\n+/).map((step, index) => (
              <p key={`${recipe.id}-${index}`}>{step}</p>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
