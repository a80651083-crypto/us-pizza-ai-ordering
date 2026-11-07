"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectCartSubtotalSen, useCart, useCartHydrated } from "@/lib/cart-store";
import { checkoutSchema, toCheckoutErrors, type CheckoutErrors } from "@/lib/checkout";
import { formatRM } from "@/lib/money";
import {
  calcDiscountSen,
  computeTotals,
  FREE_DELIVERY_MIN_SEN,
  type DiscountRule,
} from "@/lib/pricing";

type OutletChoice = { id: number; name: string; city: string };
type AppliedPromo = DiscountRule & { code: string; title: string; minSpendSen: number };

const controlClassName =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

const choiceClassName =
  "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-checked:border-primary has-checked:bg-primary/5";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function CheckoutForm({ outlets }: { outlets: OutletChoice[] }) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const lines = useCart((state) => state.lines);
  const subtotalSen = useCart(selectCartSubtotalSen);
  const clearCart = useCart((state) => state.clear);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [outletId, setOutletId] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD_DEMO">("CASH");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const isDelivery = orderType === "DELIVERY";
  const belowMinSpend = promo !== null && subtotalSen < promo.minSpendSen;
  const totals = computeTotals({
    subtotalSen,
    discountSen: promo && !belowMinSpend ? calcDiscountSen(promo, subtotalSen) : 0,
    isDelivery,
  });

  function clearError(field: string) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function applyPromo() {
    clearError("promoCode");
    try {
      const response = await fetch(`/api/promo?code=${encodeURIComponent(promoInput.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        setPromo(null);
        setErrors((current) => ({ ...current, promoCode: data.error }));
        return;
      }
      setPromo(data);
      setPromoInput("");
    } catch {
      setErrors((current) => ({ ...current, promoCode: "Couldn't check that code. Try again." }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      customerName,
      phone,
      orderType,
      outletId,
      deliveryAddress: isDelivery ? deliveryAddress : undefined,
      // A typed but unapplied code still counts. The server validates it.
      promoCode: promo?.code ?? (promoInput.trim() || undefined),
      paymentMethod,
      lines: lines.map(({ menuItemId, optionIds, quantity }) => ({
        menuItemId,
        optionIds,
        quantity,
      })),
    };

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors({ form: "Please fix the highlighted fields.", ...toCheckoutErrors(parsed.error) });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ form: "Please check your order and try again.", ...data.errors });
        setSubmitting(false);
        return;
      }
      // `submitting` stays true so the empty cart isn't shown during navigation.
      router.push(`/orders/${data.orderNo}`);
      clearCart();
    } catch {
      setErrors({ form: "We couldn't place your order. Please try again." });
      setSubmitting(false);
    }
  }

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  if (lines.length === 0 && !submitting) {
    return (
      <div className="py-12 text-center">
        <p className="text-base text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Field id="customerName" label="Name" error={errors.customerName}>
          <Input
            id="customerName"
            autoComplete="name"
            value={customerName}
            aria-invalid={!!errors.customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              clearError("customerName");
            }}
          />
        </Field>

        <Field id="phone" label="Phone" error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="012-345 6789"
            value={phone}
            aria-invalid={!!errors.phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearError("phone");
            }}
          />
        </Field>

        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold">Order type</legend>
          <div className="flex gap-2">
            <label className={choiceClassName}>
              <input
                type="radio"
                name="orderType"
                className="accent-primary"
                checked={isDelivery}
                onChange={() => setOrderType("DELIVERY")}
              />
              Delivery
            </label>
            <label className={choiceClassName}>
              <input
                type="radio"
                name="orderType"
                className="accent-primary"
                checked={!isDelivery}
                onChange={() => setOrderType("PICKUP")}
              />
              Pickup
            </label>
          </div>
        </fieldset>

        <Field id="outletId" label="Outlet" error={errors.outletId}>
          <select
            id="outletId"
            className={controlClassName}
            value={outletId}
            aria-invalid={!!errors.outletId}
            onChange={(event) => {
              setOutletId(Number(event.target.value));
              clearError("outletId");
            }}
          >
            <option value={0} disabled>
              Choose an outlet
            </option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </Field>

        {isDelivery && (
          <Field id="deliveryAddress" label="Delivery address" error={errors.deliveryAddress}>
            <textarea
              id="deliveryAddress"
              rows={3}
              autoComplete="street-address"
              className={controlClassName}
              value={deliveryAddress}
              aria-invalid={!!errors.deliveryAddress}
              onChange={(event) => {
                setDeliveryAddress(event.target.value);
                clearError("deliveryAddress");
              }}
            />
          </Field>
        )}

        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold">Payment</legend>
          <div className="flex gap-2">
            <label className={choiceClassName}>
              <input
                type="radio"
                name="paymentMethod"
                className="accent-primary"
                checked={paymentMethod === "CASH"}
                onChange={() => setPaymentMethod("CASH")}
              />
              Cash
            </label>
            <label className={choiceClassName}>
              <input
                type="radio"
                name="paymentMethod"
                className="accent-primary"
                checked={paymentMethod === "CARD_DEMO"}
                onChange={() => setPaymentMethod("CARD_DEMO")}
              />
              Card (demo)
            </label>
          </div>
          <p className="text-sm text-muted-foreground">This is a demo. Nothing is charged.</p>
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border p-4">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {lines.map((line) => (
            <li key={line.key} className="flex justify-between gap-3">
              <span className="min-w-0">
                {line.quantity} × {line.name}
                {line.optionSummary && (
                  <span className="block text-muted-foreground">{line.optionSummary}</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatRM(line.unitPriceSen * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {promo ? (
          <div className="rounded-lg bg-green-50 p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>
                <strong>{promo.code}</strong>: {promo.title}
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setPromo(null)}
              >
                Remove
              </Button>
            </div>
            {belowMinSpend && (
              <p className="mt-1 text-destructive">
                Needs a minimum spend of {formatRM(promo.minSpendSen)}.
              </p>
            )}
            {errors.promoCode && <p className="mt-1 text-destructive">{errors.promoCode}</p>}
          </div>
        ) : (
          <Field id="promoCode" label="Promo code" error={errors.promoCode}>
            <div className="flex gap-2">
              <Input
                id="promoCode"
                autoCapitalize="characters"
                value={promoInput}
                aria-invalid={!!errors.promoCode}
                onChange={(event) => {
                  setPromoInput(event.target.value);
                  clearError("promoCode");
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!promoInput.trim()}
                onClick={applyPromo}
              >
                Apply
              </Button>
            </div>
          </Field>
        )}

        <dl className="space-y-1 border-t pt-3 text-sm">
          <SummaryRow label="Subtotal" value={formatRM(totals.subtotalSen)} />
          {totals.discountSen > 0 && (
            <SummaryRow label="Discount" value={formatRM(-totals.discountSen)} />
          )}
          {isDelivery && (
            <SummaryRow
              label={`Delivery (free from ${formatRM(FREE_DELIVERY_MIN_SEN)})`}
              value={formatRM(totals.deliveryFeeSen)}
            />
          )}
          <SummaryRow label="SST (6%)" value={formatRM(totals.taxSen)} />
          <div className="flex justify-between gap-3 border-t pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatRM(totals.totalSen)}</dd>
          </div>
        </dl>

        {(errors.form || errors.lines) && (
          <p role="alert" className="text-sm text-destructive">
            {errors.lines ?? errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Placing order…" : `Place order · ${formatRM(totals.totalSen)}`}
        </Button>
      </aside>
    </form>
  );
}
