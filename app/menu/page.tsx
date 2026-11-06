import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemGridSkeleton } from "@/components/item-grid";
import { MenuBrowser } from "@/components/menu-browser";
import { getMenu } from "@/lib/menu";

export const metadata: Metadata = { title: "Menu" };

async function Menu() {
  const categories = await getMenu();
  return <MenuBrowser categories={categories} />;
}

export default function MenuPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">Our menu</h1>
      <Suspense fallback={<ItemGridSkeleton count={8} />}>
        <Menu />
      </Suspense>
    </div>
  );
}
