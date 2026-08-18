import type { Ingredient } from '../types'

/**
 * UK supermarket price table. Prices are in PENCE and are rough averages of
 * own-brand shelf prices - no supermarket publishes a usable price feed, so
 * these are seeded by hand and drift slowly. They're a starting point: correct
 * any of them from a real shelf label on the Prices screen and your number wins.
 */
export const PRICES_CHECKED = 'August 2026'

export const INGREDIENTS: Ingredient[] = [
  // --- fruit & veg ---------------------------------------------------------
  { id: 'onion', name: 'Onions', aisle: 'fruit_veg', unit: 'each', pack: { size: 6, price: 95 }, packLabel: '1kg bag (about 6)' },
  { id: 'garlic', name: 'Garlic', aisle: 'fruit_veg', unit: 'each', pack: { size: 3, price: 45 }, packLabel: '3 bulbs' },
  { id: 'carrot', name: 'Carrots', aisle: 'fruit_veg', unit: 'each', pack: { size: 10, price: 65 }, packLabel: '1kg bag (about 10)' },
  { id: 'potato', name: 'Potatoes', aisle: 'fruit_veg', unit: 'g', pack: { size: 2500, price: 175 }, packLabel: '2.5kg bag' },
  { id: 'sweetpotato', name: 'Sweet potatoes', aisle: 'fruit_veg', unit: 'g', pack: { size: 1000, price: 145 }, packLabel: '1kg bag' },
  { id: 'pepper', name: 'Peppers', aisle: 'fruit_veg', unit: 'each', pack: { size: 3, price: 165 }, packLabel: '3 pack' },
  { id: 'mushroom', name: 'Mushrooms', aisle: 'fruit_veg', unit: 'g', pack: { size: 250, price: 89 }, packLabel: '250g punnet' },
  { id: 'spinach', name: 'Spinach', aisle: 'fruit_veg', unit: 'g', pack: { size: 250, price: 145 }, packLabel: '250g bag' },
  { id: 'courgette', name: 'Courgettes', aisle: 'fruit_veg', unit: 'each', pack: { size: 2, price: 89 }, packLabel: '2 pack' },
  { id: 'ginger', name: 'Ginger', aisle: 'fruit_veg', unit: 'g', pack: { size: 100, price: 45 }, packLabel: 'a knob (about 100g)' },
  { id: 'banana', name: 'Bananas', aisle: 'fruit_veg', unit: 'each', pack: { size: 5, price: 79 }, packLabel: '5 pack' },
  { id: 'lemon', name: 'Lemons', aisle: 'fruit_veg', unit: 'each', pack: { size: 4, price: 95 }, packLabel: '4 pack' },

  // --- bakery --------------------------------------------------------------
  { id: 'wraps', name: 'Tortilla wraps', aisle: 'bakery', unit: 'each', pack: { size: 8, price: 89 }, packLabel: '8 pack' },
  { id: 'bread', name: 'Bread', aisle: 'bakery', unit: 'g', pack: { size: 800, price: 89 }, packLabel: '800g loaf' },
  { id: 'burgerbuns', name: 'Burger buns', aisle: 'bakery', unit: 'each', pack: { size: 4, price: 125 }, packLabel: '4 pack' },

  // --- meat & fish ---------------------------------------------------------
  { id: 'beefmince', name: 'Beef mince (5%)', aisle: 'meat_fish', unit: 'g', pack: { size: 500, price: 349 }, packLabel: '500g pack' },
  { id: 'chickenbrst', name: 'Chicken breasts', aisle: 'meat_fish', unit: 'g', pack: { size: 650, price: 460 }, packLabel: '650g pack' },
  { id: 'chickenthgh', name: 'Chicken thighs', aisle: 'meat_fish', unit: 'g', pack: { size: 1000, price: 350 }, packLabel: '1kg pack' },
  { id: 'sausages', name: 'Sausages', aisle: 'meat_fish', unit: 'each', pack: { size: 8, price: 189 }, packLabel: '8 pack' },
  { id: 'bacon', name: 'Bacon', aisle: 'meat_fish', unit: 'g', pack: { size: 300, price: 199 }, packLabel: '300g pack' },

  // --- dairy & eggs --------------------------------------------------------
  { id: 'eggs', name: 'Eggs', aisle: 'dairy_eggs', unit: 'each', pack: { size: 12, price: 199 }, packLabel: 'box of 12' },
  { id: 'cheddar', name: 'Cheddar', aisle: 'dairy_eggs', unit: 'g', pack: { size: 400, price: 265 }, packLabel: '400g block' },
  { id: 'milk', name: 'Milk', aisle: 'dairy_eggs', unit: 'ml', pack: { size: 2000, price: 145 }, packLabel: '2 litre' },
  { id: 'yogurt', name: 'Greek style yogurt', aisle: 'dairy_eggs', unit: 'g', pack: { size: 500, price: 95 }, packLabel: '500g pot' },
  { id: 'butter', name: 'Butter', aisle: 'dairy_eggs', unit: 'g', pack: { size: 250, price: 185 }, packLabel: '250g block' },
  { id: 'halloumi', name: 'Halloumi', aisle: 'dairy_eggs', unit: 'g', pack: { size: 225, price: 195 }, packLabel: '225g block' },

  // --- tins & jars ---------------------------------------------------------
  { id: 'choptom', name: 'Chopped tomatoes', aisle: 'tins_jars', unit: 'g', pack: { size: 400, price: 45 }, packLabel: '400g tin' },
  { id: 'kidneybean', name: 'Kidney beans', aisle: 'tins_jars', unit: 'g', pack: { size: 400, price: 45 }, packLabel: '400g tin' },
  { id: 'chickpea', name: 'Chickpeas', aisle: 'tins_jars', unit: 'g', pack: { size: 400, price: 45 }, packLabel: '400g tin' },
  { id: 'bakedbean', name: 'Baked beans', aisle: 'tins_jars', unit: 'g', pack: { size: 400, price: 39 }, packLabel: '400g tin' },
  { id: 'tuna', name: 'Tinned tuna', aisle: 'tins_jars', unit: 'g', pack: { size: 580, price: 285 }, packLabel: '4 x 145g tins' },
  { id: 'coconutmilk', name: 'Coconut milk', aisle: 'tins_jars', unit: 'ml', pack: { size: 400, price: 105 }, packLabel: '400ml tin' },
  { id: 'tompuree', name: 'Tomato puree', aisle: 'tins_jars', unit: 'g', pack: { size: 200, price: 45 }, packLabel: '200g tube' },
  { id: 'peanutbtr', name: 'Peanut butter', aisle: 'tins_jars', unit: 'g', pack: { size: 340, price: 145 }, packLabel: '340g jar' },

  // --- pasta & rice --------------------------------------------------------
  { id: 'pasta', name: 'Pasta', aisle: 'pasta_rice', unit: 'g', pack: { size: 500, price: 75 }, packLabel: '500g bag' },
  { id: 'rice', name: 'Long grain rice', aisle: 'pasta_rice', unit: 'g', pack: { size: 1000, price: 99 }, packLabel: '1kg bag' },
  { id: 'noodles', name: 'Egg noodles', aisle: 'pasta_rice', unit: 'g', pack: { size: 250, price: 55 }, packLabel: '250g pack' },
  { id: 'lentils', name: 'Red lentils', aisle: 'pasta_rice', unit: 'g', pack: { size: 500, price: 120 }, packLabel: '500g bag' },
  { id: 'oats', name: 'Porridge oats', aisle: 'pasta_rice', unit: 'g', pack: { size: 1000, price: 90 }, packLabel: '1kg bag' },

  // --- cupboard (staples: assumed owned, kept off the list) ----------------
  { id: 'oil', name: 'Vegetable oil', aisle: 'cupboard', unit: 'ml', pack: { size: 1000, price: 185 }, packLabel: '1 litre', staple: true },
  { id: 'oliveoil', name: 'Olive oil', aisle: 'cupboard', unit: 'ml', pack: { size: 500, price: 285 }, packLabel: '500ml', staple: true },
  { id: 'salt', name: 'Salt', aisle: 'cupboard', unit: 'g', pack: { size: 750, price: 65 }, packLabel: '750g', staple: true },
  { id: 'blackpepper', name: 'Black pepper', aisle: 'cupboard', unit: 'g', pack: { size: 50, price: 79 }, packLabel: '50g', staple: true },
  { id: 'stockcube', name: 'Stock cubes', aisle: 'cupboard', unit: 'each', pack: { size: 10, price: 55 }, packLabel: 'box of 10', staple: true },
  { id: 'paprika', name: 'Paprika', aisle: 'cupboard', unit: 'g', pack: { size: 45, price: 89 }, packLabel: '45g jar', staple: true },
  { id: 'cumin', name: 'Ground cumin', aisle: 'cupboard', unit: 'g', pack: { size: 43, price: 89 }, packLabel: '43g jar', staple: true },
  { id: 'currypowder', name: 'Curry powder', aisle: 'cupboard', unit: 'g', pack: { size: 85, price: 89 }, packLabel: '85g jar', staple: true },
  { id: 'chilliflake', name: 'Chilli flakes', aisle: 'cupboard', unit: 'g', pack: { size: 32, price: 89 }, packLabel: '32g jar', staple: true },
  { id: 'mixedherbs', name: 'Mixed herbs', aisle: 'cupboard', unit: 'g', pack: { size: 11, price: 79 }, packLabel: '11g jar', staple: true },
  { id: 'soysauce', name: 'Soy sauce', aisle: 'cupboard', unit: 'ml', pack: { size: 150, price: 79 }, packLabel: '150ml', staple: true },
  { id: 'turmeric', name: 'Ground turmeric', aisle: 'cupboard', unit: 'g', pack: { size: 40, price: 119 }, packLabel: '40g jar', staple: true },
  { id: 'cinnamon', name: 'Ground cinnamon', aisle: 'cupboard', unit: 'g', pack: { size: 38, price: 109 }, packLabel: '38g jar', staple: true },

  // --- frozen --------------------------------------------------------------
  { id: 'peas', name: 'Frozen peas', aisle: 'frozen', unit: 'g', pack: { size: 900, price: 135 }, packLabel: '900g bag' },
  { id: 'mixedveg', name: 'Frozen mixed veg', aisle: 'frozen', unit: 'g', pack: { size: 1000, price: 125 }, packLabel: '1kg bag' },

  // --- added for the wider recipe pack ------------------------------------
  { id: 'cherrytom', name: 'Cherry tomatoes', aisle: 'fruit_veg', unit: 'g', pack: { size: 400, price: 145 }, packLabel: '400g punnet' },
  { id: 'springonion', name: 'Spring onions', aisle: 'fruit_veg', unit: 'each', pack: { size: 8, price: 55 }, packLabel: 'a bunch (about 8)' },
  { id: 'broccoli', name: 'Broccoli', aisle: 'fruit_veg', unit: 'each', pack: { size: 1, price: 65 }, packLabel: '1 head' },
  { id: 'chorizo', name: 'Chorizo', aisle: 'meat_fish', unit: 'g', pack: { size: 225, price: 189 }, packLabel: '225g pack' },
  { id: 'feta', name: 'Feta', aisle: 'dairy_eggs', unit: 'g', pack: { size: 200, price: 145 }, packLabel: '200g block' },
  { id: 'sweetcorn', name: 'Tinned sweetcorn', aisle: 'tins_jars', unit: 'g', pack: { size: 325, price: 45 }, packLabel: '325g tin' },
  { id: 'currypaste', name: 'Thai green curry paste', aisle: 'tins_jars', unit: 'g', pack: { size: 180, price: 145 }, packLabel: '180g jar' },
  { id: 'mayo', name: 'Mayonnaise', aisle: 'tins_jars', unit: 'ml', pack: { size: 500, price: 119 }, packLabel: '500ml jar' },
  { id: 'breadcrumbs', name: 'Golden breadcrumbs', aisle: 'cupboard', unit: 'g', pack: { size: 175, price: 65 }, packLabel: '175g tub' },
  { id: 'honey', name: 'Honey', aisle: 'cupboard', unit: 'g', pack: { size: 340, price: 145 }, packLabel: '340g jar', staple: true },
  { id: 'flour', name: 'Plain flour', aisle: 'cupboard', unit: 'g', pack: { size: 1500, price: 79 }, packLabel: '1.5kg bag', staple: true },
  { id: 'salmon', name: 'Frozen salmon fillets', aisle: 'frozen', unit: 'g', pack: { size: 480, price: 385 }, packLabel: '4 fillets, 480g' },
  { id: 'frozenchips', name: 'Frozen chips', aisle: 'frozen', unit: 'g', pack: { size: 1500, price: 175 }, packLabel: '1.5kg bag' },
]

export const INGREDIENT_BY_ID: Record<string, Ingredient> =
  Object.fromEntries(INGREDIENTS.map(i => [i.id, i]))
