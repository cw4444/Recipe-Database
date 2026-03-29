"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addStockItemAction } from "@/app/actions";
import type { StockItem } from "@/lib/pantry";

type PantryPanelProps = {
  stockItems: StockItem[];
};

export function PantryPanel({ stockItems }: PantryPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await addStockItemAction(formData);
      setMessage(result.message);

      if (result.status === "success") {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <section className="panel pantry-shell">
      <div className="panel-heading">
        <p className="eyebrow">Pantry Stock</p>
        <h2>Track what is in the cupboard.</h2>
        <p className="muted">
          Add what is on hand, then recipe completions can deduct from it automatically.
        </p>
      </div>

      <form className="stock-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Ingredient</span>
          <input name="stockName" placeholder="Flour" required minLength={2} />
        </label>

        <div className="stock-grid">
          <label className="field">
            <span>Amount To Add</span>
            <input name="stockAmount" type="number" min="0.1" step="0.1" placeholder="7" required />
          </label>

          <label className="field">
            <span>Unit</span>
            <input name="stockUnit" placeholder="kg" />
          </label>

          <label className="field">
            <span>Low Stock Warning</span>
            <input name="lowStockThreshold" type="number" min="0" step="0.1" placeholder="2" />
          </label>
        </div>

        <button className="secondary-button pantry-button" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add or restock"}
        </button>

        {message ? <p className="muted">{message}</p> : null}
      </form>

      <div className="stock-list">
        {stockItems.length === 0 ? (
          <p className="muted">No stock items yet.</p>
        ) : (
          stockItems.map((item) => (
            <div className={`stock-item ${item.isLowStock ? "stock-item-low" : ""}`} key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span className="muted">
                  {item.onHand} {item.unit ?? ""}
                </span>
              </div>
              <div className="stock-meta">
                <span>Low at {item.lowStockThreshold}</span>
                {item.isLowStock ? <strong>Rebuy soon</strong> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
