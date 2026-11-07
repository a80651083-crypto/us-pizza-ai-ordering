"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY } from "@/lib/pricing";

export function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (quantity: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Decrease quantity of ${label}`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span className="w-7 text-center text-sm font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Increase quantity of ${label}`}
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
