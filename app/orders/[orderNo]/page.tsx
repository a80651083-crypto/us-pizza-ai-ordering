import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { OrderTimeline } from "@/components/order-timeline";
import { Button } from "@/components/ui/button";
import { formatRM } from "@/lib/money";
import { estimatedReadyAt, formatMYT, isFinished, statusLabel } from "@/lib/orderStatus";
import { getMyOrder } from "@/lib/orders";
import { readSessionId } from "@/lib/session";

export const metadata: Metadata = { title: "Track order" };

function Row({ label, sen }: { label: string; sen: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{formatRM(sen)}</dd>
    </div>
  );
}

async function OrderDetails({ params }: { params: PageProps<"/orders/[orderNo]">["params"] }) {
  const { orderNo } = await params;
  const order = await getMyOrder(orderNo, await readSessionId());

  if (!order) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          Orders can only be viewed from the browser that placed them.
        </p>
        <Button asChild className="mt-4">
          <Link href="/orders">My orders</Link>
        </Button>
      </div>
    );
  }

  const isDelivery = order.orderType === "DELIVERY";
  const finished = isFinished(order.status);

  return (
    <>
      {!finished && <AutoRefresh seconds={30} />}
      <p className="text-sm text-muted-foreground">
        {formatMYT(order.createdAt, { dateStyle: "medium", timeStyle: "short" })}
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight">{order.orderNo}</h1>
      <p className="mt-1 text-lg font-semibold text-primary">
        {statusLabel(order.status, order.orderType)}
      </p>
      {!finished && (
        <p className="text-sm text-muted-foreground">
          {isDelivery ? "Estimated delivery" : "Estimated ready"} by{" "}
          {formatMYT(estimatedReadyAt(order), { timeStyle: "short" })}
        </p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border p-4">
          {order.status === "CANCELLED" ? (
            <p className="font-semibold">This order was cancelled.</p>
          ) : (
            <OrderTimeline status={order.status} orderType={order.orderType} />
          )}
        </section>

        <section className="space-y-4 rounded-xl border p-4 text-sm">
          <ul className="space-y-2">
            {order.items.map((item) => {
              const options = item.selectedOptions as { name: string }[];
              return (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {item.quantity} × {item.nameSnapshot}
                    {options.length > 0 && (
                      <span className="block text-muted-foreground">
                        {options.map((option) => option.name).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatRM(item.lineTotalSen)}</span>
                </li>
              );
            })}
          </ul>

          <dl className="space-y-1 border-t pt-3">
            <Row label="Subtotal" sen={order.subtotalSen} />
            {order.discountSen > 0 && <Row label="Discount" sen={-order.discountSen} />}
            {isDelivery && <Row label="Delivery" sen={order.deliveryFeeSen} />}
            <Row label="SST (6%)" sen={order.taxSen} />
            <div className="flex justify-between gap-3 border-t pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatRM(order.totalSen)}</dd>
            </div>
          </dl>

          <div className="space-y-1 border-t pt-3 text-muted-foreground">
            <p>
              {isDelivery ? "From" : "Pickup at"} {order.outlet.name} ({order.outlet.phone})
            </p>
            {order.deliveryAddress && <p>Deliver to: {order.deliveryAddress}</p>}
            <p>Payment: {order.paymentMethod === "CASH" ? "Cash" : "Card (demo)"}</p>
          </div>
        </section>
      </div>
    </>
  );
}

export default function OrderPage({ params }: PageProps<"/orders/[orderNo]">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <OrderDetails params={params} />
      </Suspense>
    </div>
  );
}
