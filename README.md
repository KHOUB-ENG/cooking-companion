# Cooking Companion

A phone-first meal planner for uni. Pick your shop, say what kit you've got,
swipe on recipes, get a costed shopping list.

Built as a web app (PWA) — it installs to the iPhone home screen and works
offline. No backend, no login, no server costs. All your data lives in your
phone's browser storage.

## Running it

Needs Node.js 20+.

```bash
npm install
```

```bash
npm run dev
```

Then open the localhost link it prints.

## What's here

| Path | What it is |
| --- | --- |
| `src/types.ts` | The data model — recipes, ingredients, equipment, the plan |
| `src/data/ingredients.ts` | Aldi price table, in pence. Hand-seeded |
| `src/data/recipes.ts` | The recipe pack (10 seeds; ~70 is the goal) |
| `src/lib/cost.ts` | **The brain.** Pack maths, filtering, ranking |
| `src/lib/store.ts` | localStorage persistence + data export |
| `src/screens/` | The six screens, in flow order |

## The bit that matters

`buildBasket()` in `src/lib/cost.ts` works out two different numbers:

- **buy cost** — whole packs, what actually leaves your bank account
- **eaten cost** — the fraction you actually use

Every other recipe app only shows the second one, which is why their
"£1.20 a portion" never matches your receipt. Mince comes in a 500g pack
whether your recipe wants 250g or not.

The difference between the two is money sitting in your cupboard — which is
why the app also tracks which ingredients get used by more than one recipe.

## Conventions

- **Money is always integer pence.** Never floats — totals can't drift.
- **Quantities are always in the ingredient's own `unit`** (`g`, `ml`, `each`).
- Recipe `ingredients[].qty` is for the whole recipe at `baseServings`.
  Scaling happens in `scaledQty()`.
- Staples (salt, oil, spices) are assumed owned and stay off the shopping list.

## Prices

There's no public Aldi API and scraping supermarkets is fragile and against
their terms, so `ingredients.ts` is seeded by hand. Re-check it once a term
and bump `PRICES_CHECKED`.

## Deploying

Static build — no server needed.

```bash
npm run build
```

That produces `dist/`, a folder of plain files. Push the repo to GitHub, point
Vercel at it, and it deploys on every push. Then on the iPhone: open the URL in
**Safari** → Share → Add to Home Screen.

## Still to do

- [ ] Content pass: the full ~70 recipes and ~150 priced items
- [ ] Recipe photos (AI-generated once, into `public/recipes/`)
- [ ] PWA manifest + service worker so it installs and works offline
- [ ] Leftover chaining should *influence the deck order*, not just report
      afterwards
