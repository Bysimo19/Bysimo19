export const MEALS = [
  { id: 'desayuno', label: 'Desayuno', icon: 'coffee' },
  { id: 'comida', label: 'Comida', icon: 'salad' },
  { id: 'merienda', label: 'Merienda', icon: 'apple' },
  { id: 'cena', label: 'Cena', icon: 'moon' },
  { id: 'snack', label: 'Snacks', icon: 'star' },
];

export function mealByTime(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 20) return 'merienda';
  return 'cena';
}

const r1 = (n) => Math.round(n * 10) / 10;

/** Macros de `grams` gramos de un alimento con valores por 100 g. */
export function macrosFor(food, grams) {
  const k = (Number(grams) || 0) / 100;
  return { kcal: Math.round(food.kcal * k), protein: r1(food.protein * k), carbs: r1(food.carbs * k), fat: r1(food.fat * k) };
}

export function sumMacros(list) {
  return list.reduce((a, m) => ({
    kcal: a.kcal + (m.kcal || 0), protein: r1(a.protein + (m.protein || 0)), carbs: r1(a.carbs + (m.carbs || 0)), fat: r1(a.fat + (m.fat || 0)),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

// Valores por 100 g / 100 ml de los ingredientes de batidos y crema de arroz.
export const INGREDIENTS = {
  whey: { name: 'Proteína whey', kcal: 380, protein: 78, carbs: 7, fat: 5 },
  water: { name: 'Agua', kcal: 0, protein: 0, carbs: 0, fat: 0 },
  milk_semi: { name: 'Leche semidesnatada', kcal: 46, protein: 3.2, carbs: 4.7, fat: 1.6 },
  milk_whole: { name: 'Leche entera', kcal: 64, protein: 3.1, carbs: 4.7, fat: 3.6 },
  oat_drink: { name: 'Bebida de avena', kcal: 45, protein: 1, carbs: 7, fat: 1.5 },
  rice_cream: { name: 'Crema de arroz', kcal: 370, protein: 7, carbs: 82, fat: 1 },
  banana: { name: 'Plátano', kcal: 90, protein: 1.1, carbs: 21, fat: 0.3 },
  peanut: { name: 'Crema de cacahuete', kcal: 590, protein: 25, carbs: 12, fat: 50 },
  cocoa: { name: 'Cacao puro', kcal: 360, protein: 20, carbs: 12, fat: 21 },
  honey: { name: 'Miel', kcal: 304, protein: 0.3, carbs: 82, fat: 0 },
  oats: { name: 'Copos de avena', kcal: 370, protein: 13.5, carbs: 59, fat: 7 },
  berries: { name: 'Frutos rojos', kcal: 45, protein: 0.7, carbs: 10, fat: 0.3 },
};

export const LIQUIDS = [
  { id: 'water', label: 'Agua' },
  { id: 'milk_semi', label: 'Leche semi' },
  { id: 'milk_whole', label: 'Leche entera' },
  { id: 'oat_drink', label: 'Bebida avena' },
];

/** Extras con cantidades típicas para la crema de arroz y los batidos. */
export const EXTRAS = [
  { id: 'whey', label: 'Proteína whey', grams: 30, unit: 'scoop' },
  { id: 'banana', label: 'Plátano', grams: 120, unit: 'unidad' },
  { id: 'peanut', label: 'Crema de cacahuete', grams: 15, unit: 'cda' },
  { id: 'cocoa', label: 'Cacao puro', grams: 8, unit: 'cda' },
  { id: 'honey', label: 'Miel', grams: 15, unit: 'cda' },
  { id: 'oats', label: 'Avena', grams: 40, unit: 'ración' },
  { id: 'berries', label: 'Frutos rojos', grams: 80, unit: 'ración' },
];

/** Construye una lista de ingredientes [{id, grams}] → macros + texto. */
export function recipe(items) {
  const parts = items.filter((i) => i.grams > 0).map((i) => ({ ...i, ...macrosFor(INGREDIENTS[i.id], i.grams), name: INGREDIENTS[i.id].name }));
  return { parts, total: sumMacros(parts) };
}
