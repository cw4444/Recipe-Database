"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { makeRecipeAction } from "@/app/actions";

type MakeRecipeButtonProps = {
  recipeId: string;
};

export function MakeRecipeButton({ recipeId }: MakeRecipeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="primary-button"
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await makeRecipeAction(recipeId);
          router.refresh();
          window.alert(result.message);
        });
      }}
    >
      {pending ? "Updating stock..." : "Made this recipe"}
    </button>
  );
}
