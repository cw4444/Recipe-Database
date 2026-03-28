"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { submitRecipeAction, type RecipeActionState } from "@/app/actions";

type RecipeOption = {
  id: string;
  name: string;
  slug: string;
};

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
};

const emptyRow = (): IngredientRow => ({
  id: crypto.randomUUID(),
  label: "",
  quantity: "",
  unit: "",
  notes: "",
  linkedRecipeId: "",
});

export function RecipeForm({ recipeOptions }: RecipeFormProps) {
  const [state, setState] = useState<RecipeActionState>({ status: "idle", revision: 0 });
  const [resetVersion, setResetVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await submitRecipeAction(formData);
      setState(result);

      if (result.status === "success") {
        form.reset();
        setResetVersion((current) => current + 1);
      }
    });
  }

  return (
    <form className="panel form-shell" onSubmit={handleSubmit} ref={formRef}>
      <div className="panel-heading">
        <p className="eyebrow">Add Recipe</p>
        <h2>Build dishes out of ingredients and other recipes.</h2>
        <p className="muted">
          Start with base recipes like bechamel, pesto, stock, or pastry, then
          link them into bigger dishes.
        </p>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Name</span>
          <input name="name" placeholder="Bechamel sauce" required minLength={2} />
        </label>

        <label className="field">
          <span>Servings</span>
          <input name="servings" type="number" min="1" placeholder="4" />
        </label>

        <label className="field">
          <span>Prep Minutes</span>
          <input name="prepMinutes" type="number" min="0" placeholder="10" />
        </label>

        <label className="field">
          <span>Cook Minutes</span>
          <input name="cookMinutes" type="number" min="0" placeholder="15" />
        </label>
      </div>

      <label className="field">
        <span>Quick Summary</span>
        <input
          name="summary"
          placeholder="Creamy white sauce used in lasagne, pies, and gratins."
        />
      </label>

      <label className="field">
        <span>Instructions</span>
        <textarea
          name="instructions"
          rows={6}
          minLength={10}
          placeholder="Melt the butter, whisk in the flour, then add milk gradually..."
          required
        />
      </label>

      <IngredientEditor key={resetVersion} recipeOptions={recipeOptions} />

      <div className="form-footer">
        <div className="status-copy">
          <p className="muted">
            Tip: if a row links to another recipe, keep the ingredient name human-friendly.
          </p>
          {state.message ? (
            <p className={state.status === "error" ? "error-text" : "success-text"}>
              {state.message}
            </p>
          ) : null}
        </div>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save recipe"}
        </button>
      </div>
    </form>
  );
}

function IngredientEditor({ recipeOptions }: RecipeFormProps) {
  const [rows, setRows] = useState<IngredientRow[]>([emptyRow(), emptyRow()]);

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

  return (
    <>
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
                    placeholder="Whole milk"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Quantity</span>
                  <input
                    value={row.quantity}
                    placeholder="500"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, quantity: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Unit</span>
                  <input
                    value={row.unit}
                    placeholder="ml"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, unit: event.target.value }
                            : item,
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
                    {recipeOptions.map((recipe) => (
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
                  placeholder="Warm first if using for sauce"
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
    </>
  );
}
