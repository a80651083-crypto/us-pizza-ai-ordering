"use client";

import {
  CakeSlice,
  CupSoda,
  Drumstick,
  Flame,
  Leaf,
  Pizza,
  Soup,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart-store";
import type { MenuItemView } from "@/lib/menu";
import { formatRM } from "@/lib/money";
import { cn } from "@/lib/utils";

const categoryVisuals: Record<string, { icon: LucideIcon; className: string }> = {
  pizza: { icon: Pizza, className: "bg-red-100 text-red-600" },
  pasta: { icon: Soup, className: "bg-amber-100 text-amber-700" },
  sides: { icon: Drumstick, className: "bg-orange-100 text-orange-700" },
  drinks: { icon: CupSoda, className: "bg-sky-100 text-sky-700" },
  desserts: { icon: CakeSlice, className: "bg-pink-100 text-pink-700" },
};

function ItemBadges({ item }: { item: MenuItemView }) {
  return (
    <div className="flex flex-wrap gap-1">
      {item.tags.includes("bestseller") && (
        <Badge className="bg-amber-100 text-amber-900">
          <Star /> Bestseller
        </Badge>
      )}
      {item.tags.includes("new") && (
        <Badge className="bg-violet-100 text-violet-900">
          <Sparkles /> New
        </Badge>
      )}
      {item.isVegetarian && (
        <Badge className="bg-green-100 text-green-900">
          <Leaf /> Vegetarian
        </Badge>
      )}
      {item.spicyLevel > 0 && (
        <Badge className="bg-red-100 text-red-900">
          <Flame /> Spicy
        </Badge>
      )}
    </div>
  );
}

export function MenuItemCard({
  item,
  onChoose,
}: {
  item: MenuItemView;
  onChoose: (item: MenuItemView) => void;
}) {
  const addLine = useCart((state) => state.addLine);
  const inCart = useCart((state) =>
    state.lines.reduce(
      (count, line) => (line.menuItemId === item.id ? count + line.quantity : count),
      0,
    ),
  );

  const hasOptions = item.options.length > 0;
  const visual = categoryVisuals[item.category.slug] ?? categoryVisuals.pizza;
  const Icon = visual.icon;

  function handleAdd() {
    if (hasOptions) {
      onChoose(item);
      return;
    }
    addLine({
      menuItemId: item.id,
      optionIds: [],
      name: item.name,
      optionSummary: "",
      unitPriceSen: item.basePriceSen,
      quantity: 1,
    });
  }

  return (
    <Card className="flex-row gap-0 overflow-hidden py-0 sm:flex-col">
      <div
        className={cn(
          "flex w-24 shrink-0 items-center justify-center sm:h-32 sm:w-full",
          visual.className,
        )}
      >
        <Icon className="size-10 sm:size-12" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="leading-tight font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <ItemBadges item={item} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div>
            <p className="font-semibold tabular-nums">
              {hasOptions && <span className="font-normal text-muted-foreground">from </span>}
              {formatRM(item.basePriceSen)}
            </p>
            {inCart > 0 && <p className="text-xs text-muted-foreground">{inCart} in cart</p>}
          </div>
          <Button size="sm" onClick={handleAdd} aria-label={`Add ${item.name}`}>
            {hasOptions ? "Choose" : "Add"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
