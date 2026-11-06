import type { Prisma } from "@prisma/client";
import { connection } from "next/server";
import { prisma } from "@/lib/db";

const itemInclude = {
  category: { select: { slug: true } },
  // "Size" sorts after "Crust", so descending puts Size first in the dialog.
  options: { orderBy: [{ groupName: "desc" }, { sortOrder: "asc" }] },
} satisfies Prisma.MenuItemInclude;

export type MenuItemView = Prisma.MenuItemGetPayload<{ include: typeof itemInclude }>;
export type MenuCategoryView = Awaited<ReturnType<typeof getMenu>>[number];

// connection() keeps these reads at request time, so a reseed shows up straight
// away and builds don't need the database.
export async function getMenu() {
  await connection();
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { id: "asc" },
        include: itemInclude,
      },
    },
  });
}

export async function getFeaturedItems() {
  await connection();
  return prisma.menuItem.findMany({
    where: { isAvailable: true, tags: { has: "bestseller" } },
    orderBy: { id: "asc" },
    take: 4,
    include: itemInclude,
  });
}
