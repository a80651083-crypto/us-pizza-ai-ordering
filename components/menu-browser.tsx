"use client";

import { useState } from "react";
import { Flame, Leaf, Search } from "lucide-react";
import { ItemGrid } from "@/components/item-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MenuCategoryView } from "@/lib/menu";

const ALL = "all";

export function MenuBrowser({ categories }: { categories: MenuCategoryView[] }) {
  const [tab, setTab] = useState(ALL);
  const [search, setSearch] = useState("");
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);

  const term = search.trim().toLowerCase();
  const sections = categories
    .filter((category) => tab === ALL || category.slug === tab)
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          (!vegetarianOnly || item.isVegetarian) &&
          (!spicyOnly || item.spicyLevel > 0) &&
          `${item.name} ${item.description}`.toLowerCase().includes(term),
      ),
    }))
    .filter((category) => category.items.length > 0);

  function clearFilters() {
    setSearch("");
    setVegetarianOnly(false);
    setSpicyOnly(false);
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={vegetarianOnly ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            aria-pressed={vegetarianOnly}
            onClick={() => setVegetarianOnly(!vegetarianOnly)}
          >
            <Leaf /> Vegetarian
          </Button>
          <Button
            variant={spicyOnly ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            aria-pressed={spicyOnly}
            onClick={() => setSpicyOnly(!spicyOnly)}
          >
            <Flame /> Spicy
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value={ALL} className="px-3">
            All
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category.slug} value={category.slug} className="px-3">
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value={tab} className="space-y-8">
        {sections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base text-muted-foreground">No items match your search.</p>
            <Button variant="link" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.slug}>
              <h2 className="mb-3 text-xl font-bold">{section.name}</h2>
              <ItemGrid items={section.items} />
            </section>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
