import type { RecipeWithIngredients } from "@/lib/recipes";

type RecipeCardProps = {
  recipe: RecipeWithIngredients;
  recipeMap: Map<string, RecipeWithIngredients>;
  depth?: number;
  trail?: string[];
};

function formatMeta(label: string, value?: number | null) {
  if (!value) {
    return null;
  }

  return `${value} ${label}`;
}

export function RecipeCard({
  recipe,
  recipeMap,
  depth = 0,
  trail = [],
}: RecipeCardProps) {
  const nextTrail = [...trail, recipe.id];
  const isNested = depth > 0;

  return (
    <article className={`recipe-card ${isNested ? "recipe-card-nested" : ""}`} id={recipe.slug}>
      <div className="recipe-header">
        <div>
          <p className="eyebrow">{isNested ? "Sub-Recipe" : "Recipe"}</p>
          <h3>{recipe.name}</h3>
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

      <div className="recipe-body">
        <section>
          <h4>Ingredients</h4>
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
                    Pulls from <a href={`#${ingredient.linkedRecipe.slug}`}>{ingredient.linkedRecipe.name}</a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>Method</h4>
          <div className="instructions">
            {recipe.instructions.split(/\n+/).map((step, index) => (
              <p key={`${recipe.id}-${index}`}>{step}</p>
            ))}
          </div>
        </section>
      </div>

      {depth < 2 ? (
        <div className="nested-recipes">
          {recipe.ingredients
            .map((ingredient) => ingredient.linkedRecipeId)
            .filter((value): value is string => Boolean(value))
            .filter((value, index, current) => current.indexOf(value) === index)
            .map((linkedRecipeId) => {
              if (nextTrail.includes(linkedRecipeId)) {
                return (
                  <p className="muted" key={`${recipe.id}-${linkedRecipeId}`}>
                    Nested recipe loop skipped to avoid recursive display.
                  </p>
                );
              }

              const linkedRecipe = recipeMap.get(linkedRecipeId);

              if (!linkedRecipe) {
                return null;
              }

              return (
                <RecipeCard
                  key={linkedRecipe.id}
                  recipe={linkedRecipe}
                  recipeMap={recipeMap}
                  depth={depth + 1}
                  trail={nextTrail}
                />
              );
            })}
        </div>
      ) : null}
    </article>
  );
}
