import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { formatRM } from "@/lib/money";
import { formatMYT, statusLabel } from "@/lib/orderStatus";
import { getMyOrders } from "@/lib/orders";
import { readSessionId } from "@/lib/session";

export const metadata: Metadata = { title: "My orders" };

async function OrderList() {
  const orders = await getMyOrders(await readSessionId());

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-base text-muted-foreground">You haven&apos;t placed any orders yet.</p>
        <Button asChild className="mt-4">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders/${order.orderNo}`}
            className="block rounded-xl border p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{order.orderNo}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMYT(order.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatRM(order.totalSen)}</p>
            </div>
            <p className="mt-2 text-sm font-medium text-primary">
              {statusLabel(order.status, order.orderType)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">My orders</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
        <OrderList />
      </Suspense>
    </div>
  );
}
