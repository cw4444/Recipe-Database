"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitRecipeAction, type RecipeActionState } from "@/app/actions";
import type { RecipeOption, RecipeWithIngredients } from "@/lib/recipes";

type IngredientRow = {
  id: string;
  label: string;
  quantity: string;
  unit: string;
  notes: string;
  linkedRecipeId: string;
};

type RecipeFormProps = {
  recipeOptions: RecipeOption[];
  categories: string[];
  mainIngredients: string[];
  initialRecipe?: RecipeWithIngredients | null;
  selectedCategory?: string;
  cancelHref?: string;
};

const emptyRow = (): IngredientRow => ({
  id: crypto.randomUUID(),
  label: "",
  quantity: "",
  unit: "",
  notes: "",
  linkedRecipeId: "",
});

function buildInitialRows(initialRecipe?: RecipeWithIngredients | null) {
  if (!initialRecipe) {
    return [emptyRow(), emptyRow()];
  }

  return initialRecipe.ingredients.length > 0
    ? initialRecipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        label: ingredient.label,
        quantity: ingredient.quantity ?? "",
        unit: ingredient.unit ?? "",
        notes: ingredient.notes ?? "",
        linkedRecipeId: ingredient.linkedRecipeId ?? "",
      }))
    : [emptyRow()];
}

export function RecipeForm({
  recipeOptions,
  categories,
  mainIngredients,
  initialRecipe,
  selectedCategory,
  cancelHref = "/",
}: RecipeFormProps) {
  const router = useRouter();
  const [state, setState] = useState<RecipeActionState>({ status: "idle", revision: 0 });
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<IngredientRow[]>(() => buildInitialRows(initialRecipe));

  const serialisedIngredients = useMemo(
    () =>
      JSON.stringify(
        rows.map(({ label, quantity, unit, notes, linkedRecipeId }) => ({
          label,
          quantity,
          unit,
          notes,
          linkedRecipeId,
        })),
      ),
    [rows],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await submitRecipeAction(formData);
      setState(result);

      if (result.status === "success" && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <form className="panel form-shell" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <p className="eyebrow">{initialRecipe ? "Edit Recipe" : "Add Recipe"}</p>
        <h2>{initialRecipe ? `Update ${initialRecipe.name}` : "Add a new recipe or sub-recipe."}</h2>
        <p className="muted">
          Use categories for browsing, then link smaller recipes into larger dishes.
        </p>
      </div>

      {initialRecipe ? <input name="recipeId" type="hidden" value={initialRecipe.id} /> : null}

      <div className="field-grid">
        <label className="field">
          <span>Name</span>
          <input
            defaultValue={initialRecipe?.name ?? ""}
            name="name"
            placeholder="Recipe name"
            required
            minLength={2}
          />
        </label>

        <label className="field">
          <span>Category</span>
          <select
            defaultValue={initialRecipe?.category ?? selectedCategory ?? ""}
            name="category"
          >
            <option value="">Choose a category</option>
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
            defaultValue={initialRecipe?.mainIngredient ?? ""}
            name="mainIngredient"
          >
            <option value="">Choose an ingredient</option>
            {mainIngredients.map((mainIngredient) => (
              <option key={mainIngredient} value={mainIngredient}>
                {mainIngredient}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Servings</span>
          <input
            defaultValue={initialRecipe?.servings ?? ""}
            name="servings"
            type="number"
            min="1"
            placeholder="e.g. 4"
          />
        </label>

        <label className="field">
          <span>Prep Minutes</span>
          <input
            defaultValue={initialRecipe?.prepMinutes ?? ""}
            name="prepMinutes"
            type="number"
            min="0"
            placeholder="e.g. 15"
          />
        </label>

        <label className="field">
          <span>Cook Minutes</span>
          <input
            defaultValue={initialRecipe?.cookMinutes ?? ""}
            name="cookMinutes"
            type="number"
            min="0"
            placeholder="e.g. 45"
          />
        </label>
      </div>

      <label className="field">
        <span>Quick Summary</span>
        <input
          defaultValue={initialRecipe?.summary ?? ""}
          name="summary"
          placeholder="Short description of the recipe"
        />
      </label>

      <label className="field">
        <span>Instructions</span>
        <textarea
          defaultValue={initialRecipe?.instructions ?? ""}
          name="instructions"
          rows={6}
          minLength={10}
          placeholder="Write the method here"
          required
        />
      </label>

      <div className="ingredient-editor">
        <div className="section-row">
          <div>
            <p className="eyebrow">Ingredients</p>
            <h3>Each row can be a normal ingredient or a linked sub-recipe.</h3>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setRows((current) => [...current, emptyRow()])}
          >
            Add row
          </button>
        </div>

        <p className="inline-tip">
          Need to create a sub-recipe first? Save it separately, then come back and link it here.
        </p>

        <div className="ingredient-list">
          {rows.map((row, index) => (
            <div className="ingredient-row" key={row.id}>
              <div className="ingredient-row-header">
                <strong>Row {index + 1}</strong>
                {rows.length > 1 ? (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      setRows((current) => current.filter((item) => item.id !== row.id))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="ingredient-grid">
                <label className="field">
                  <span>Ingredient Name</span>
                  <input
                    value={row.label}
                    placeholder="Ingredient name"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Quantity</span>
                  <input
                    value={row.quantity}
                    placeholder="Amount"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id ? { ...item, quantity: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Unit</span>
                  <input
                    value={row.unit}
                    placeholder="Unit"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id ? { ...item, unit: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Linked Recipe</span>
                  <select
                    value={row.linkedRecipeId}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, linkedRecipeId: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="">Plain ingredient</option>
                    {recipeOptions
                      .filter((recipe) => recipe.id !== initialRecipe?.id)
                      .map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Notes</span>
                <input
                  value={row.notes}
                  placeholder="Optional notes"
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id ? { ...item, notes: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <input name="ingredients" type="hidden" value={serialisedIngredients} readOnly />

      <div className="form-footer">
        <div className="status-copy">
          <p className="muted">
            Linked rows behave like reusable building blocks for bigger recipes.
          </p>
          {state.message ? (
            <p className={state.status === "error" ? "error-text" : "success-text"}>
              {state.message}
            </p>
          ) : null}
        </div>
        <div className="form-actions">
          <a className="ghost-link" href={cancelHref}>
            Cancel
          </a>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Saving..." : initialRecipe ? "Update recipe" : "Save recipe"}
          </button>
        </div>
      </div>
    </form>
  );
}
