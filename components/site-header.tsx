import Link from "next/link";
import { CartButton } from "@/components/cart-button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/orders", label: "My Orders" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="shrink-0 text-lg font-extrabold tracking-tight sm:text-xl">
          US Pizza
        </Link>
        <nav className="ml-auto flex items-center gap-3 text-sm font-medium sm:gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <CartButton />
      </div>
    </header>
  );
}
