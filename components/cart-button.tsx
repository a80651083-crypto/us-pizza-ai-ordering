"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { selectCartCount, selectCartSubtotalSen, useCart } from "@/lib/cart-store";
import { formatRM } from "@/lib/money";

export function CartButton() {
  const lines = useCart((state) => state.lines);
  const setQuantity = useCart((state) => state.setQuantity);
  const removeLine = useCart((state) => state.removeLine);
  const count = useCart(selectCartCount);
  const subtotalSen = useCart(selectCartSubtotalSen);

  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="relative shrink-0 bg-white text-primary hover:bg-red-50"
          aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
        >
          <ShoppingCart />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-neutral-900 tabular-nums">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="text-lg font-semibold">Your cart</SheetTitle>
          <SheetDescription>Final total is confirmed at checkout.</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <p className="flex-1 p-8 text-center text-muted-foreground">Your cart is empty.</p>
        ) : (
          <ul className="flex-1 divide-y overflow-y-auto px-4">
            {lines.map((line) => (
              <li key={line.key} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{line.name}</p>
                    {line.optionSummary && (
                      <p className="text-muted-foreground">{line.optionSummary}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">
                    {formatRM(line.unitPriceSen * line.quantity)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <QuantityStepper
                    value={line.quantity}
                    label={line.name}
                    onChange={(quantity) => setQuantity(line.key, quantity)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => removeLine(line.key)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <SheetFooter className="mt-0 border-t">
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatRM(subtotalSen)}</span>
          </div>
          {lines.length > 0 && (
            <SheetClose asChild>
              <Button asChild size="lg">
                <Link href="/checkout">Checkout</Link>
              </Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
