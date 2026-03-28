"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteRecipeAction } from "@/app/actions";

type DeleteRecipeButtonProps = {
  recipeId: string;
  category?: string | null;
};

export function DeleteRecipeButton({ recipeId, category }: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="ghost-button danger-button"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this recipe? This cannot be undone.")) {
          return;
        }

        startTransition(async () => {
          const result = await deleteRecipeAction(recipeId, category ?? undefined);
          router.push(result.redirectTo);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting..." : "Delete recipe"}
    </button>
  );
}
