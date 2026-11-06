import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_QUANTITY = 20;

/** Prices here are for display only. The server recalculates them at checkout. */
export type CartLine = {
  key: string;
  menuItemId: number;
  optionIds: number[];
  name: string;
  optionSummary: string;
  unitPriceSen: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
};

const lineKey = (menuItemId: number, optionIds: number[]) =>
  `${menuItemId}:${[...optionIds].sort((a, b) => a - b).join("-")}`;

const clampQuantity = (quantity: number) => Math.min(Math.max(quantity, 1), MAX_QUANTITY);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) =>
        set(({ lines }) => {
          const key = lineKey(line.menuItemId, line.optionIds);
          const existing = lines.some((l) => l.key === key);
          return {
            lines: existing
              ? lines.map((l) =>
                  l.key === key
                    ? { ...l, quantity: clampQuantity(l.quantity + line.quantity) }
                    : l,
                )
              : [...lines, { ...line, key, quantity: clampQuantity(line.quantity) }],
          };
        }),
      setQuantity: (key, quantity) =>
        set(({ lines }) => ({
          lines: lines.map((l) =>
            l.key === key ? { ...l, quantity: clampQuantity(quantity) } : l,
          ),
        })),
      removeLine: (key) =>
        set(({ lines }) => ({ lines: lines.filter((l) => l.key !== key) })),
    }),
    // The server has no cart, so loading it is deferred until after hydration
    // (see CartButton) to keep the first client render identical to the HTML.
    { name: "us-pizza-cart", skipHydration: true },
  ),
);

export const selectCartCount = (state: CartState) =>
  state.lines.reduce((count, line) => count + line.quantity, 0);

export const selectCartSubtotalSen = (state: CartState) =>
  state.lines.reduce((sum, line) => sum + line.unitPriceSen * line.quantity, 0);
