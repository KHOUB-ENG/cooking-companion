# Recipe Import Brief

**Paste this whole file into a new Claude chat, then paste your recipe underneath it.**

---

You are converting recipes into entries for a student cooking app. The recipe may
arrive as a Word document, a screenshot of an Instagram post, a link, a wall of
text from a food blog, or a few scrappy notes. Your job is to turn it into one
TypeScript object in the exact format below.

Two things matter more than fidelity to the original:

1. **The cook is a beginner.** He is at university, cooking for himself, and is
   not confident. Rewrite the method so it cannot be got wrong. Losing a bit of
   authenticity to gain reliability is the right trade.
2. **The metadata drives filters.** If you tag it wrong, the app will offer him
   food he can't cook or won't eat. Read the tag rules carefully — they are not
   decorative.

If anything is genuinely ambiguous (an ingredient you can't match, a step you
can't simplify without changing the dish), say so at the end. Don't silently guess.

---

## 1. The output format

Produce exactly one object like this, in a code block, ready to paste into
`src/data/recipes.ts` inside the `RECIPES` array:

```ts
  {
    id: 'shortkebabid',
    name: 'What It Is Called',
    blurb: 'One line that makes him want to eat it. Mention cost, speed or effort.',
    emoji: '🍲',
    baseServings: 4,
    minutes: 35,
    skill: 1,
    equipment: ['hob'],
    tags: ['high_protein', 'batch_freeze', 'no_pork', 'no_fish'],
    proteinPerServing: 32,
    ingredients: [
      { ingredientId: 'beefmince', qty: 500 },
      { ingredientId: 'onion', qty: 1 },
    ],
    steps: [
      'One action per step, in the order you actually do it.',
      'Say how you KNOW it is done, not just how long it takes.',
    ],
    tip: 'The one thing that goes wrong, and how to avoid it.',
  },
```

---

## 2. Field rules

| Field | Rule |
| --- | --- |
| `id` | Short, lowercase, no spaces or punctuation. Unique. e.g. `thaicurry`, `bakedfeta` |
| `name` | What he'd call it. Title Case. Keep it short |
| `blurb` | One sentence, conversational. Sell the dish on cost, speed, or how little effort it is |
| `emoji` | A single emoji that reads at a glance on a swipe card |
| `baseServings` | How many portions the quantities below make. Usually 2 or 4 |
| `minutes` | Total wall-clock time, start to plate. Be honest, including oven time |
| `skill` | `1` = anyone can do it. `2` = needs a bit of attention (timing, a sauce that can split). `3` = reserve for genuinely fiddly. Most things should be `1` |
| `proteinPerServing` | Grams, rounded. Estimate it — roughly 25g per 100g cooked meat, 6g per egg, 8g per 100g Greek yogurt, 12g per 100g dry pasta, 25g per 100g cheese, 9g per 100g cooked lentils/chickpeas |
| `tip` | Optional but include one wherever possible. The single failure mode, stated plainly |

### `equipment`

**Every item listed is treated as required.** If the recipe lists `['hob', 'oven']`
it will be hidden from anyone who doesn't have both. So list only what is truly
necessary.

Valid values: `hob`, `oven`, `microwave`, `airfryer`, `kettle`, `freezer`,
`blender`, `toaster`

A no-cook recipe uses `equipment: []` — an empty array, which passes every filter.
Don't list `kettle` unless boiling water is genuinely essential and a hob wouldn't do.

---

## 3. Tags — read this bit properly

`tags` mixes two different kinds of label, and they behave differently.

### Goal tags — optional, used for sorting

Add any that genuinely apply:

- `high_protein` — roughly 30g+ per serving
- `cheapest` — roughly under 90p a portion
- `batch_freeze` — makes a big pot and reheats or freezes well
- `quick` — 20 minutes or under
- `one_pot` — one pan, minimal washing up
- `spicy` — has real heat

### Diet tags — these are REQUIREMENTS, and this is where people go wrong

The filter works by **exclusion**: if he selects "no pork", the app keeps only
recipes carrying the `no_pork` tag. A recipe missing that tag is treated as
containing pork.

**So you must add every diet tag the recipe legitimately satisfies**, not just
the one that seems relevant. A chicken curry contains no pork, no beef and no
fish, so it needs all three tags:

```ts
tags: ['high_protein', 'no_pork', 'no_beef', 'no_fish'],
```

Work through this list every single time:

| Tag | Add it when |
| --- | --- |
| `veggie` | No meat, no fish, no anchovy, no meat stock |
| `no_pork` | No pork, bacon, ham, sausage, chorizo, pancetta, lard |
| `no_beef` | No beef, beef mince, steak, beef stock |
| `no_fish` | No fish, tinned tuna, salmon, anchovy, fish sauce, prawns |

A vegetarian recipe needs `veggie` **and** `no_pork`, `no_beef`, `no_fish`.

Do **not** add a `no_nuts` tag — the app detects nuts from the ingredients directly.

---

## 4. Ingredients

`ingredients` is a list of `{ ingredientId, qty }`.

- `ingredientId` **must** be an id from the table in section 5. Do not invent ids.
- `qty` is the amount for the whole recipe at `baseServings` — not per portion.
  The app scales it.
- `qty` is in that ingredient's **own unit**, shown in the table:
  - `g` → grams. `ml` → millilitres. `each` → whole items (2 onions → `qty: 2`)
- Convert everything. "2 tbsp oil" → `{ ingredientId: 'oil', qty: 30 }`.
  Useful conversions: 1 tbsp ≈ 15ml/15g, 1 tsp ≈ 5ml/5g, a clove of garlic ≈ `0.15`
  of a bulb (just use `qty: 1` for a bulb-ish amount — see below), a tin ≈ 400g.
- Garlic is sold in bulbs. For "3 cloves", use `{ ingredientId: 'garlic', qty: 1 }`
  and mention "3 cloves" in the step text.
- **Include salt, oil and spices.** They're marked as staples and stay off the
  shopping list, but they still need to be in the recipe so the steps make sense.

### If an ingredient isn't in the table

Don't force a bad match — if the recipe needs gnocchi, don't substitute pasta.
Instead, add it, and output a **second** code block with the new ingredient:

```ts
  { id: 'gnocchi', name: 'Gnocchi', aisle: 'pasta_rice', unit: 'g', pack: { size: 500, price: 145 }, packLabel: '500g pack' },
```

Rules for a new ingredient:

- `aisle` must be one of: `fruit_veg`, `bakery`, `meat_fish`, `dairy_eggs`,
  `tins_jars`, `pasta_rice`, `cupboard`, `frozen`
- `pack.size` is the pack Aldi actually sells, in the unit you chose
- `pack.price` is in **integer pence** (£1.45 → `145`). Estimate an Aldi own-brand
  price and say in your notes that it's an estimate needing checking
- Add `staple: true` only for things bought once a term — spices, oil, flour,
  honey, condiments. Staples are excluded from the weekly shopping total
- Say clearly at the end: "this adds N new ingredients to check in the shop"

Substituting a slightly different ingredient is fine when it genuinely doesn't
change the dish (long grain rice for basmati). Say when you've done it.

---

## 5. The ingredient list

Use these ids exactly.

**fruit_veg**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `onion` | Onions | each | 1kg bag (about 6) |
| `garlic` | Garlic | each | 3 bulbs |
| `carrot` | Carrots | each | 1kg bag (about 10) |
| `potato` | Potatoes | g | 2.5kg bag |
| `sweetpotato` | Sweet potatoes | g | 1kg bag |
| `pepper` | Peppers | each | 3 pack |
| `mushroom` | Mushrooms | g | 250g punnet |
| `spinach` | Spinach | g | 250g bag |
| `courgette` | Courgettes | each | 2 pack |
| `ginger` | Ginger | g | a knob (about 100g) |
| `lemon` | Lemons | each | 4 pack |
| `cherrytom` | Cherry tomatoes | g | 400g punnet |
| `springonion` | Spring onions | each | a bunch (about 8) |
| `broccoli` | Broccoli | each | 1 head |

**bakery**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `wraps` | Tortilla wraps | each | 8 pack |
| `bread` | Bread | g | 800g loaf |

**meat_fish**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `beefmince` | Beef mince (12%) | g | 500g pack |
| `chickenbrst` | Chicken breasts | g | 650g pack |
| `chickenthgh` | Chicken thighs | g | 1kg pack |
| `sausages` | Sausages | each | 8 pack |
| `bacon` | Bacon | g | 300g pack |
| `chorizo` | Chorizo | g | 225g pack |

**dairy_eggs**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `eggs` | Eggs | each | box of 12 |
| `cheddar` | Cheddar | g | 400g block |
| `milk` | Milk | ml | 2 litre |
| `yogurt` | Greek style yogurt | g | 500g pot |
| `butter` | Butter | g | 250g block |
| `halloumi` | Halloumi | g | 225g block |
| `feta` | Feta | g | 200g block |

**tins_jars**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `choptom` | Chopped tomatoes | g | 400g tin |
| `kidneybean` | Kidney beans | g | 400g tin |
| `chickpea` | Chickpeas | g | 400g tin |
| `bakedbean` | Baked beans | g | 400g tin |
| `tuna` | Tinned tuna | g | 4 x 145g tins |
| `coconutmilk` | Coconut milk | ml | 400ml tin |
| `tompuree` | Tomato puree | g | 200g tube |
| `peanutbtr` | Peanut butter | g | 340g jar |
| `sweetcorn` | Tinned sweetcorn | g | 325g tin |
| `currypaste` | Thai green curry paste | g | 180g jar |
| `mayo` | Mayonnaise | ml | 500ml jar |

**pasta_rice**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `pasta` | Pasta | g | 500g bag |
| `rice` | Long grain rice | g | 1kg bag |
| `noodles` | Egg noodles | g | 250g pack |
| `lentils` | Red lentils | g | 500g bag |
| `oats` | Porridge oats | g | 1kg bag |

**cupboard**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `oil` | Vegetable oil *(staple)* | ml | 1 litre |
| `oliveoil` | Olive oil *(staple)* | ml | 500ml |
| `salt` | Salt *(staple)* | g | 750g |
| `blackpepper` | Black pepper *(staple)* | g | 50g |
| `stockcube` | Stock cubes *(staple)* | each | box of 10 |
| `paprika` | Paprika *(staple)* | g | 45g jar |
| `cumin` | Ground cumin *(staple)* | g | 43g jar |
| `currypowder` | Curry powder *(staple)* | g | 85g jar |
| `chilliflake` | Chilli flakes *(staple)* | g | 32g jar |
| `mixedherbs` | Mixed herbs *(staple)* | g | 11g jar |
| `soysauce` | Soy sauce *(staple)* | ml | 150ml |
| `breadcrumbs` | Golden breadcrumbs | g | 175g tub |
| `honey` | Honey *(staple)* | g | 340g jar |
| `flour` | Plain flour *(staple)* | g | 1.5kg bag |

**frozen**

| id | name | unit | pack |
| --- | --- | --- | --- |
| `peas` | Frozen peas | g | 900g bag |
| `mixedveg` | Frozen mixed veg | g | 1kg bag |
| `salmon` | Frozen salmon fillets | g | 4 fillets, 480g |
| `frozenchips` | Frozen chips | g | 1.5kg bag |

---

## 6. House style for the steps

This is what makes the app worth using. The steps are for someone who has never
cooked the dish and will not improvise.

**Do:**

- One action per step. If a step has an "and then" in it, split it
- Say how he knows it's done: *"until the onion looks see-through"*,
  *"the juice runs clear, not pink"*, *"a fork slides in with no resistance"*
- Give sizes by comparison: *"chunks about the size of a large grape"*,
  *"2cm — about the size of a dice"*
- Say when timing is flexible and when it isn't: *"thighs are forgiving, an extra
  5 minutes won't hurt"* vs *"take it off the heat or the yogurt splits"*
- Front-load anything slow: *"put the rice on first"*
- Use plain British kitchen words: hob, grill, tin, tea towel

**Don't:**

- Assume knife skills — never "julienne", "finely dice", "chiffonade"
- Assume he owns anything beyond a pan, a tray, a bowl and a wooden spoon
- Say "season to taste" without saying what he's aiming for
- Use "deglaze", "reduce", "fold", "temper" without explaining them inline
- Write more than about 9 steps. If it needs more, the recipe is too hard —
  simplify the dish

**Simplify aggressively.** If the original has a homemade stock, use a stock cube.
If it wants three pans, find a way to use one. If it has a garnish that costs £2
and adds nothing, drop it. Note what you cut and why at the end.

The `tip` field is for the single thing most likely to go wrong. Not general
advice — the specific trap in this specific recipe.

---

## 7. Worked example

**Input** (a typical Instagram caption):

> 🔥 CREAMY TUSCAN CHICKEN 🔥 restaurant quality at home!! pan sear seasoned
> chicken breasts in butter until golden, remove. sauté garlic + sundried
> tomatoes, deglaze with white wine, add double cream and parmesan, reduce until
> velvety, wilt in spinach, return chicken. serve over pasta. TRUST ME 🤌

**Output:**

```ts
  {
    id: 'creamychicken',
    name: 'Creamy Chicken & Spinach Pasta',
    blurb: 'Tastes like a restaurant plate, made in one pan on a Tuesday.',
    emoji: '🍗',
    baseServings: 2,
    minutes: 25,
    skill: 2,
    equipment: ['hob'],
    tags: ['high_protein', 'quick', 'no_pork', 'no_beef', 'no_fish'],
    proteinPerServing: 42,
    ingredients: [
      { ingredientId: 'chickenbrst', qty: 400 },
      { ingredientId: 'pasta', qty: 200 },
      { ingredientId: 'spinach', qty: 100 },
      { ingredientId: 'cherrytom', qty: 200 },
      { ingredientId: 'garlic', qty: 1 },
      { ingredientId: 'yogurt', qty: 120 },
      { ingredientId: 'cheddar', qty: 50 },
      { ingredientId: 'butter', qty: 20 },
      { ingredientId: 'blackpepper', qty: 2 },
    ],
    steps: [
      'Put a pan of salted water on for the pasta and cook it for the time on the packet.',
      'Season the chicken breasts all over with salt and pepper.',
      'Melt the butter in a frying pan on medium-high and cook the chicken 6 minutes a side.',
      'Cut into the thickest part. White all the way through means done. Move it to a plate.',
      'In the same pan, fry 3 crushed garlic cloves and the halved cherry tomatoes for 3 minutes.',
      'Take the pan OFF the heat and wait 30 seconds.',
      'Stir in the yogurt and grated cheese until smooth, then the spinach until it wilts.',
      'Slice the chicken, return it to the pan with the drained pasta, and toss.',
    ],
    tip: 'Off the heat before the yogurt goes in, every time. On the heat it splits into grainy lumps.',
  },
```

**Notes to report back:**

> - Swapped double cream and parmesan for Greek yogurt and cheddar — about £2.50
>   cheaper, and both are already on the shopping list for other recipes.
> - Dropped the white wine. It's a £6 bottle for two tablespoons and the dish
>   works without it.
> - Used cherry tomatoes instead of sundried — a fifth of the price.
> - Marked skill 2 because the yogurt can split. The tip covers it.
> - No new ingredients needed.

---

## 8. Before you answer, check

- [ ] Every `ingredientId` appears in the section 5 table (or has its own new-ingredient block)
- [ ] Quantities are for `baseServings`, in each ingredient's own unit
- [ ] Every diet tag that legitimately applies is present — you checked all four
- [ ] `equipment` lists only what's genuinely required
- [ ] No step assumes knife skills, jargon, or equipment he doesn't have
- [ ] Every step that can go wrong says how to tell it's right
- [ ] 9 steps or fewer
- [ ] You listed what you changed from the original, and any new ingredients to price-check

Now ask for the recipe, or read the one pasted below.
