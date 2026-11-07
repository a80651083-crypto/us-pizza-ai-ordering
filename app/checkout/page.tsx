import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Checkout" };

async function Checkout() {
  await connection();
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, city: true },
  });
  return <CheckoutForm outlets={outlets} />;
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Checkout />
      </Suspense>
    </div>
  );
}
