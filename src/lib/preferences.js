// Food preferences: diet, allergies and foods someone likes or avoids. Pure functions, no React.
//
// Be honest about what this can and cannot do. It can tidy the food search and flag things worth a second look. It
// cannot promise that a food is safe: the built-in tags describe the usual version of each food, and the barcode
// database is community-entered. Anything shown to someone with an allergy comes with a "check the label" reminder.

export const DIETS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
];

export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', word: 'gluten' },
  { id: 'dairy', label: 'Dairy', word: 'dairy' },
  { id: 'egg', label: 'Eggs', word: 'egg' },
  { id: 'peanut', label: 'Peanuts', word: 'peanuts' },
  { id: 'treenut', label: 'Tree nuts', word: 'tree nuts' },
  { id: 'soy', label: 'Soy', word: 'soy' },
  { id: 'fish', label: 'Fish', word: 'fish' },
  { id: 'shellfish', label: 'Shellfish', word: 'shellfish' },
  { id: 'sesame', label: 'Sesame', word: 'sesame' },
];

export const EMPTY_PREFERENCES = { diets: [], avoid: [], likes: [], dislikes: [] };
export const MAX_TERMS = 30;
export const MAX_TERM_LENGTH = 40;

// What each diet rules out, in terms of the "contains" tags on the built-in foods.
const DIET_RULES = {
  vegetarian: ['meat', 'fish', 'shellfish'],
  vegan: ['meat', 'fish', 'shellfish', 'dairy', 'egg'],
  pescatarian: ['meat'],
};
const CHECKABLE_DIETS = Object.keys(DIET_RULES);

const cleanTerms = (value) => {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const term = typeof item === 'string' ? item.trim().slice(0, MAX_TERM_LENGTH) : '';
    if (term && !out.some((t) => t.toLowerCase() === term.toLowerCase())) out.push(term);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
};

const onlyKnown = (value, options) => (Array.isArray(value) ? options.filter((o) => value.includes(o.id)).map((o) => o.id) : []);

// Clean up whatever is in storage so a bad value can never crash the app.
export function cleanPreferences(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return { diets: onlyKnown(s.diets, DIETS), avoid: onlyKnown(s.avoid, ALLERGENS), likes: cleanTerms(s.likes), dislikes: cleanTerms(s.dislikes) };
}

// True when there is something we can check a food against (halal and kosher cannot be checked).
export const hasFoodRules = (prefs) => prefs.avoid.length > 0 || prefs.diets.some((d) => CHECKABLE_DIETS.includes(d));
export const hasAnyPreferences = (prefs) => prefs.diets.length + prefs.avoid.length + prefs.likes.length + prefs.dislikes.length > 0;

/* ---------- Search results (the built-in food list) ---------- */

const allergenWord = (id) => ALLERGENS.find((a) => a.id === id)?.word ?? id;

// Short reasons a built-in food does not fit, such as "Not vegan" or "Contains gluten". Empty means it fits.
export function foodWarnings(food, prefs) {
  const contains = food.contains ?? [];
  const reasons = [];
  const broken = prefs.diets.filter((d) => DIET_RULES[d]?.some((tag) => contains.includes(tag)));
  // Vegan covers everything vegetarian does, so saying both would just be noise.
  for (const diet of broken.includes('vegan') ? ['vegan', ...broken.filter((d) => d === 'pescatarian')] : broken) reasons.push(`Not ${diet}`);
  for (const id of prefs.avoid) if (contains.includes(id)) reasons.push(`Contains ${allergenWord(id)}`);
  return reasons;
}

// "bananas" should match "Banana", and "chicken" should match "Chicken breast, cooked".
export function matchesTerm(name, term) {
  const n = String(name).toLowerCase();
  const t = String(term).toLowerCase().trim();
  if (!t) return false;
  return n.includes(t) || (t.length > 3 && t.endsWith('s') && n.includes(t.slice(0, -1)));
}
export const isLiked = (food, prefs) => prefs.likes.some((t) => matchesTerm(food.name, t));
export const isDisliked = (food, prefs) => prefs.dislikes.some((t) => matchesTerm(food.name, t));

/* ---------- Scanned products (Open Food Facts) ---------- */

// Open Food Facts allergen tags look like "en:milk", but people also enter free text ("en:cereals-with-gluten"), so
// match on words rather than exact tags. This is a best effort, which is why a reminder always accompanies it.
const ALLERGEN_PATTERNS = {
  gluten: /gluten|wheat|rye|barley|spelt/,
  dairy: /milk|lactose|dairy/,
  egg: /(^|[^a-z])eggs?([^a-z]|$)/,
  peanut: /peanut/,
  treenut: /(^|[^a-z])nuts?([^a-z]|$)|almond|hazelnut|walnut|cashew|pecan|pistachio|macadamia|brazil/,
  soy: /soy/,
  fish: /(^|[^a-z])fish/, // a letter before "fish" (as in "shellfish") does not count
  shellfish: /crustacean|mollus|shellfish|shrimp|prawn|crab|lobster/,
  sesame: /sesame/,
};

const bare = (tag) => String(tag).toLowerCase().replace(/^[a-z]{2}:/, '');
export const tagMatches = (tag, allergenId) => ALLERGEN_PATTERNS[allergenId]?.test(bare(tag)) ?? false;

// What to tell someone about a scanned product, given their preferences. Everything is worded as what the database
// says, never as a guarantee.
export function scanWarnings(product, prefs) {
  const flags = [];
  const traces = [];
  const notes = [];

  for (const id of prefs.avoid) {
    const word = allergenWord(id);
    if (product.allergens?.some((t) => tagMatches(t, id))) flags.push(`The database lists ${word} as an allergen in this product.`);
    else if (product.traces?.some((t) => tagMatches(t, id))) traces.push(`The database says this may contain traces of ${word}.`);
  }

  const analysis = (product.analysis ?? []).map(bare);
  const nonVegan = analysis.includes('non-vegan');
  const nonVegetarian = analysis.includes('non-vegetarian');
  const veganKnown = nonVegan || analysis.includes('vegan');
  const vegetarianKnown = nonVegetarian || analysis.includes('vegetarian') || analysis.includes('vegan');

  if (prefs.diets.includes('vegan')) {
    if (nonVegan) flags.push("The database says this product isn't vegan.");
    else if (!veganKnown) notes.push("The database doesn't say whether this is vegan.");
  } else if (prefs.diets.includes('vegetarian')) {
    if (nonVegetarian) flags.push("The database says this product isn't vegetarian.");
    else if (!vegetarianKnown) notes.push("The database doesn't say whether this is vegetarian.");
  }

  return {
    flags,
    traces,
    notes,
    disliked: prefs.dislikes.some((t) => matchesTerm(product.name, t)),
    reminder: prefs.avoid.length > 0, // always remind people with allergies: the absence of a warning is not a guarantee
  };
}

// Short tags for a saved product in a list, such as "Contains dairy" or "Not vegan". `flags` are things the database
// lists against the person's rules (and hide the food when the filter is on), `traces` are only "may contain".
export function productTags(product, prefs) {
  const flags = [];
  const traces = [];
  for (const id of prefs.avoid) {
    const word = allergenWord(id);
    if (product.allergens?.some((t) => tagMatches(t, id))) flags.push(`Contains ${word}`);
    else if (product.traces?.some((t) => tagMatches(t, id))) traces.push(`May contain ${word}`);
  }
  const analysis = (product.analysis ?? []).map(bare);
  if (prefs.diets.includes('vegan') && analysis.includes('non-vegan')) flags.push('Not vegan');
  else if (prefs.diets.includes('vegetarian') && analysis.includes('non-vegetarian')) flags.push('Not vegetarian');
  return { flags, traces };
}
