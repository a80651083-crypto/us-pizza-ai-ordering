"use client";

import { useState } from "react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/lib/cart-store";
import type { MenuItemView } from "@/lib/menu";
import { formatRM } from "@/lib/money";

type Option = MenuItemView["options"][number];

function groupOptions(options: Option[]) {
  const groups = new Map<string, Option[]>();
  for (const option of options) {
    groups.set(option.groupName, [...(groups.get(option.groupName) ?? []), option]);
  }
  return [...groups.entries()];
}

export function ItemDialog({ item, onClose }: { item: MenuItemView; onClose: () => void }) {
  const addLine = useCart((state) => state.addLine);
  const groups = groupOptions(item.options);

  const [selectedIds, setSelectedIds] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      groups.map(([group, options]) => [
        group,
        (options.find((option) => option.isDefault) ?? options[0]).id,
      ]),
    ),
  );
  const [quantity, setQuantity] = useState(1);

  const selected = item.options.filter((option) => selectedIds[option.groupName] === option.id);
  const unitPriceSen =
    item.basePriceSen + selected.reduce((sum, option) => sum + option.priceDeltaSen, 0);

  function handleAdd() {
    addLine({
      menuItemId: item.id,
      optionIds: selected.map((option) => option.id),
      name: item.name,
      optionSummary: selected.map((option) => option.name).join(", "),
      unitPriceSen,
      quantity,
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>

        {groups.map(([group, options]) => (
          <fieldset key={group} className="space-y-2">
            <legend className="text-sm font-semibold">{group}</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm has-checked:border-primary has-checked:bg-primary/5"
              >
                <input
                  type="radio"
                  name={group}
                  className="accent-primary"
                  checked={selectedIds[group] === option.id}
                  onChange={() => setSelectedIds((ids) => ({ ...ids, [group]: option.id }))}
                />
                <span className="flex-1">{option.name}</span>
                {option.priceDeltaSen > 0 && (
                  <span className="text-muted-foreground tabular-nums">
                    +{formatRM(option.priceDeltaSen)}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
        ))}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <QuantityStepper value={quantity} label={item.name} onChange={setQuantity} />
          <Button onClick={handleAdd}>
            Add to cart · <span className="tabular-nums">{formatRM(unitPriceSen * quantity)}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
