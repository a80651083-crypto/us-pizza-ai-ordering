"use client";

import { useState } from "react";
import { ItemDialog } from "@/components/item-dialog";
import { MenuItemCard } from "@/components/menu-item-card";
import type { MenuItemView } from "@/lib/menu";

export const itemGridClassName = "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4";

export function ItemGrid({ items }: { items: MenuItemView[] }) {
  const [choosing, setChoosing] = useState<MenuItemView | null>(null);

  return (
    <>
      <div className={itemGridClassName}>
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} onChoose={setChoosing} />
        ))}
      </div>
      {choosing && (
        <ItemDialog key={choosing.id} item={choosing} onClose={() => setChoosing(null)} />
      )}
    </>
  );
}

export function ItemGridSkeleton({ count }: { count: number }) {
  return (
    <div className={itemGridClassName} aria-label="Loading menu">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-xl bg-muted sm:h-72" />
      ))}
    </div>
  );
}
