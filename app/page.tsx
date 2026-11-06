import Link from "next/link";
import { Pizza } from "lucide-react";
import { Suspense } from "react";
import { ItemGrid, ItemGridSkeleton } from "@/components/item-grid";
import { Button } from "@/components/ui/button";
import { getFeaturedItems } from "@/lib/menu";

async function FeaturedItems() {
  const items = await getFeaturedItems();
  return <ItemGrid items={items} />;
}

export default function HomePage() {
  return (
    <>
      <section className="bg-red-50">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-12 sm:py-20">
          <div className="max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
              Hot pizza, delivered fast
            </h1>
            <p className="mt-3 text-lg text-neutral-700">
              Pick your size and crust, order in minutes, and follow your pizza from oven to door.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/menu">Order now</Link>
            </Button>
          </div>
          <Pizza className="hidden size-48 shrink-0 text-primary/80 sm:block" aria-hidden />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <h2 className="mb-4 text-2xl font-bold">Customer favourites</h2>
        <Suspense fallback={<ItemGridSkeleton count={4} />}>
          <FeaturedItems />
        </Suspense>
      </section>
    </>
  );
}
