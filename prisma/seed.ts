import { OrderStatus, OrderType, PaymentMethod, PrismaClient } from "@prisma/client";
import { computeTotals } from "../lib/pricing";

const prisma = new PrismaClient();

const SEED_SESSION_ID = "00000000-0000-4000-8000-000000000001";
const MINUTE = 60_000;

const RM = (ringgit: number) => Math.round(ringgit * 100);

const categories = [
  { name: "Pizza", slug: "pizza" },
  { name: "Pasta", slug: "pasta" },
  { name: "Sides", slug: "sides" },
  { name: "Drinks", slug: "drinks" },
  { name: "Desserts", slug: "desserts" },
];

// basePriceSen is the cheapest way to buy the item (Personal, Classic crust for
// pizzas), so every option delta is >= 0 and "from RM x" is always true.
const pizzaOptions = [
  { groupName: "Size", name: "Personal", priceDeltaSen: 0, isDefault: true, sortOrder: 0 },
  { groupName: "Size", name: "Regular", priceDeltaSen: RM(10), sortOrder: 1 },
  { groupName: "Size", name: "Large", priceDeltaSen: RM(18), sortOrder: 2 },
  { groupName: "Crust", name: "Classic", priceDeltaSen: 0, isDefault: true, sortOrder: 0 },
  { groupName: "Crust", name: "Thin", priceDeltaSen: 0, sortOrder: 1 },
  { groupName: "Crust", name: "Cheese-stuffed", priceDeltaSen: RM(6), sortOrder: 2 },
];

type SeedItem = {
  category: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  calories: number;
  isVegetarian?: boolean;
  spicyLevel?: number;
  tags?: string[];
};

const items: SeedItem[] = [
  // Pizza
  { category: "pizza", name: "Pepperoni Classic", slug: "pepperoni-classic", description: "Beef pepperoni, mozzarella and our slow-cooked tomato sauce.", price: 22.9, calories: 780, tags: ["bestseller"] },
  { category: "pizza", name: "Margherita", slug: "margherita", description: "Tomato sauce, fresh mozzarella and basil. Simple and good.", price: 18.9, calories: 640, isVegetarian: true },
  { category: "pizza", name: "Hawaiian Chicken", slug: "hawaiian-chicken", description: "Smoked chicken, pineapple and mozzarella.", price: 23.9, calories: 760, tags: ["bestseller"] },
  { category: "pizza", name: "Spicy Sambal Chicken", slug: "spicy-sambal-chicken", description: "Sambal-marinated chicken, red onion and chilli flakes.", price: 24.9, calories: 800, spicyLevel: 3, tags: ["new"] },
  { category: "pizza", name: "Veggie Garden", slug: "veggie-garden", description: "Mushroom, capsicum, olives, onion and sweet corn.", price: 20.9, calories: 660, isVegetarian: true, tags: ["bestseller"] },
  { category: "pizza", name: "Four Cheese", slug: "four-cheese", description: "Mozzarella, cheddar, parmesan and feta on a white sauce.", price: 24.9, calories: 860, isVegetarian: true },
  { category: "pizza", name: "BBQ Beef Feast", slug: "bbq-beef-feast", description: "Minced beef, beef bacon, onion and smoky BBQ sauce.", price: 26.9, calories: 900 },
  { category: "pizza", name: "Seafood Tom Yum", slug: "seafood-tom-yum", description: "Prawn and squid on a tom yum sauce with lemongrass and lime leaf.", price: 27.9, calories: 740, spicyLevel: 2, tags: ["new"] },
  // Pasta
  { category: "pasta", name: "Spaghetti Bolognese", slug: "spaghetti-bolognese", description: "Spaghetti in a rich minced beef and tomato sauce.", price: 18.9, calories: 620 },
  { category: "pasta", name: "Creamy Mushroom Fettuccine", slug: "creamy-mushroom-fettuccine", description: "Fettuccine with sauteed mushrooms in a garlic cream sauce.", price: 17.9, calories: 680, isVegetarian: true },
  { category: "pasta", name: "Aglio Olio Prawn", slug: "aglio-olio-prawn", description: "Spaghetti with prawns, garlic, olive oil and bird's eye chilli.", price: 21.9, calories: 590, spicyLevel: 1 },
  // Sides
  { category: "sides", name: "Garlic Bread", slug: "garlic-bread", description: "Four slices of toasted garlic butter bread.", price: 8.9, calories: 320, isVegetarian: true },
  { category: "sides", name: "Buffalo Wings (6 pcs)", slug: "buffalo-wings", description: "Crispy chicken wings tossed in a tangy hot sauce.", price: 15.9, calories: 540, spicyLevel: 2, tags: ["bestseller"] },
  { category: "sides", name: "Cheesy Fries", slug: "cheesy-fries", description: "Golden fries topped with melted cheese sauce.", price: 10.9, calories: 480, isVegetarian: true },
  { category: "sides", name: "Caesar Salad", slug: "caesar-salad", description: "Romaine, croutons, parmesan and a creamy dressing.", price: 12.9, calories: 280, isVegetarian: true },
  // Drinks
  { category: "drinks", name: "Iced Lemon Tea", slug: "iced-lemon-tea", description: "House-brewed black tea with lemon.", price: 5.9, calories: 110, isVegetarian: true },
  { category: "drinks", name: "Cola (Can)", slug: "cola-can", description: "Chilled 320ml can.", price: 3.9, calories: 140, isVegetarian: true },
  { category: "drinks", name: "Mineral Water", slug: "mineral-water", description: "500ml bottle.", price: 2.5, calories: 0, isVegetarian: true },
  // Desserts
  { category: "desserts", name: "Chocolate Lava Cake", slug: "chocolate-lava-cake", description: "Warm chocolate cake with a molten centre.", price: 11.9, calories: 430, isVegetarian: true, tags: ["bestseller"] },
  { category: "desserts", name: "Tiramisu Cup", slug: "tiramisu-cup", description: "Coffee-soaked sponge layered with mascarpone cream.", price: 12.9, calories: 390, isVegetarian: true },
];

const outlets = [
  { name: "US Pizza Johor Bahru", address: "Demo Address 1, Jalan Demo, 80000 Johor Bahru, Johor", city: "Johor Bahru", phone: "07-000 0001", openTime: "10:00", closeTime: "22:00" },
  { name: "US Pizza Damansara Heights", address: "Demo Address 2, Jalan Demo, 50490 Kuala Lumpur", city: "Kuala Lumpur", phone: "03-0000 0002", openTime: "10:00", closeTime: "23:00" },
  { name: "US Pizza Penang", address: "Demo Address 3, Jalan Demo, 10000 George Town, Penang", city: "Penang", phone: "04-000 0003", openTime: "11:00", closeTime: "22:00" },
];

const promotions = [
  { code: "WELCOME10", title: "10% off your order", description: "10% off any order, no minimum spend.", discountType: "PERCENT" as const, discountValue: 10, minSpendSen: 0, validFrom: new Date("2026-01-01T00:00:00+08:00"), validTo: new Date("2026-12-31T23:59:59+08:00") },
  { code: "FAMILY20", title: "RM20 off family orders", description: "RM20 off when you spend RM100 or more.", discountType: "FIXED" as const, discountValue: RM(20), minSpendSen: RM(100), validFrom: new Date("2026-01-01T00:00:00+08:00"), validTo: new Date("2026-12-31T23:59:59+08:00") },
  { code: "MERDEKA25", title: "Merdeka 25% off", description: "25% off for Merdeka month. This promotion has ended.", discountType: "PERCENT" as const, discountValue: 25, minSpendSen: 0, validFrom: new Date("2026-08-01T00:00:00+08:00"), validTo: new Date("2026-09-16T23:59:59+08:00") },
];

const faqs = [
  { topic: "delivery", question: "How much is delivery?", answer: "Delivery is RM5. It is free when your order is RM60 or more after discounts." },
  { topic: "delivery", question: "Which areas do you deliver to?", answer: "We deliver within 8 km of each outlet: central Johor Bahru, Damansara Heights in KL, and George Town in Penang. Areas further out, such as Pasir Gudang, are outside our delivery zone, but you can still order for pickup." },
  { topic: "delivery", question: "How long does an order take?", answer: "Most orders are delivered or ready for pickup within 30 minutes. You can follow your order on its tracking page." },
  { topic: "payment", question: "What payment methods do you accept?", answer: "Cash, or Card (demo). This is a demo site, so no real payment is taken." },
  { topic: "allergens", question: "What allergens are in your food?", answer: "Our pizzas and pastas contain wheat (gluten) and milk. Seafood items contain shellfish. Everything is made in a shared kitchen, so we cannot guarantee any item is allergen-free." },
  { topic: "allergens", question: "Do you use pork?", answer: "No. This demo menu uses chicken, beef and seafood only, with no pork or lard." },
  { topic: "hours", question: "What are your opening hours?", answer: "Hours differ by outlet. Johor Bahru opens 10am to 10pm, Damansara Heights 10am to 11pm, and Penang 11am to 10pm, every day." },
  { topic: "general", question: "Can I cancel or change my order?", answer: "Please call your outlet within 2 minutes of ordering, before preparation starts. Orders cannot be cancelled or changed on the website or through the chatbot." },
];

type LineInput = { slug: string; quantity: number; options?: string[] };

async function buildLines(lines: LineInput[]) {
  return Promise.all(
    lines.map(async ({ slug, quantity, options = [] }) => {
      const item = await prisma.menuItem.findUniqueOrThrow({
        where: { slug },
        include: { options: true },
      });
      const selected = options.map((name) => {
        const option = item.options.find((o) => o.name === name);
        if (!option) throw new Error(`${slug} has no option "${name}"`);
        return { group: option.groupName, name: option.name, priceDeltaSen: option.priceDeltaSen };
      });
      const unitPriceSen =
        item.basePriceSen + selected.reduce((sum, o) => sum + o.priceDeltaSen, 0);
      return {
        menuItemId: item.id,
        nameSnapshot: item.name,
        unitPriceSen,
        quantity,
        selectedOptions: selected,
        lineTotalSen: unitPriceSen * quantity,
      };
    }),
  );
}

async function createSampleOrder(order: {
  orderNo: string;
  customerName: string;
  phone: string;
  orderType: OrderType;
  outletCity: string;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: Date;
  lines: LineInput[];
}) {
  const { lines, outletCity, ...fields } = order;
  const outlet = await prisma.outlet.findFirstOrThrow({ where: { city: outletCity } });
  const orderItems = await buildLines(lines);
  const totals = computeTotals({
    subtotalSen: orderItems.reduce((sum, line) => sum + line.lineTotalSen, 0),
    discountSen: 0,
    isDelivery: order.orderType === OrderType.DELIVERY,
  });
  await prisma.order.create({
    data: {
      ...fields,
      ...totals,
      sessionId: SEED_SESSION_ID,
      outletId: outlet.id,
      items: { create: orderItems },
    },
  });
}

async function main() {
  // Wipes everything, orders included, and restarts ids so menu ids stay stable.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "ChatMessage", "OrderItem", "Order", "GuestSession", "Faq",
      "Promotion", "Outlet", "MenuItemOption", "MenuItem", "Category"
    RESTART IDENTITY CASCADE
  `);

  await prisma.category.createMany({
    data: categories.map((category, sortOrder) => ({ ...category, sortOrder })),
  });
  const categoryRows = await prisma.category.findMany();
  const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));

  for (const { category, price, tags = [], ...item } of items) {
    await prisma.menuItem.create({
      data: {
        ...item,
        categoryId: categoryId.get(category)!,
        basePriceSen: RM(price),
        tags,
        options: category === "pizza" ? { create: pizzaOptions } : undefined,
      },
    });
  }

  await prisma.outlet.createMany({ data: outlets });
  await prisma.promotion.createMany({ data: promotions });
  await prisma.faq.createMany({ data: faqs });
  await prisma.guestSession.create({ data: { id: SEED_SESSION_ID } });

  await createSampleOrder({
    orderNo: "USP-10001",
    customerName: "Aisyah Rahman",
    phone: "0120001234",
    orderType: OrderType.DELIVERY,
    outletCity: "Johor Bahru",
    deliveryAddress: "Demo Address 10, Taman Demo, 80100 Johor Bahru",
    paymentMethod: PaymentMethod.CASH,
    status: OrderStatus.BAKING,
    createdAt: new Date(Date.now() - 12 * MINUTE),
    lines: [
      { slug: "pepperoni-classic", quantity: 1, options: ["Large", "Classic"] },
      { slug: "garlic-bread", quantity: 1 },
      { slug: "iced-lemon-tea", quantity: 2 },
    ],
  });

  await createSampleOrder({
    orderNo: "USP-10002",
    customerName: "Daniel Tan",
    phone: "0170005678",
    orderType: OrderType.PICKUP,
    outletCity: "Kuala Lumpur",
    paymentMethod: PaymentMethod.CARD_DEMO,
    status: OrderStatus.DELIVERED,
    createdAt: new Date(Date.now() - 24 * 60 * MINUTE),
    lines: [
      { slug: "margherita", quantity: 2, options: ["Regular", "Thin"] },
      { slug: "chocolate-lava-cake", quantity: 1 },
    ],
  });

  const [menuItems, options, orders] = await Promise.all([
    prisma.menuItem.count(),
    prisma.menuItemOption.count(),
    prisma.order.count(),
  ]);
  console.log(`Seeded ${menuItems} menu items, ${options} options, ${orders} orders.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
