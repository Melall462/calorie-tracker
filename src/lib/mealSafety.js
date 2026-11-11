// A second pair of eyes on meals the AI writes (and on recipes you saved). The AI is told your allergies and diet, but
// it can slip, so every meal's name and ingredient names are checked here against word lists before it is saved.
//
// This is a keyword screen, not a guarantee. It cannot know what is inside "sauce", and the lists will never be
// complete, so the app always tells people to check ingredients themselves. Pure functions, no React.
import { ALLERGENS, matchesTerm } from './preferences.js';

const ALLERGEN_WORDS = {
  gluten: ['wheat', 'flour', 'bread', 'breadcrumb', 'pasta', 'spaghetti', 'noodle', 'couscous', 'bulgur', 'semolina', 'barley', 'rye', 'spelt', 'seitan', 'tortilla', 'pita', 'naan', 'cracker', 'cereal', 'granola', 'muesli', 'oat', 'beer', 'soy sauce', 'biscuit', 'pizza', 'wrap', 'bagel', 'croissant', 'pancake', 'dumpling', 'gnocchi', 'orzo', 'farro', 'panko', 'udon', 'ramen', 'pastry', 'baguette', 'sourdough', 'toast', 'bun', 'crouton'],
  dairy: ['milk', 'cheese', 'butter', 'yoghurt', 'yogurt', 'cream', 'whey', 'ghee', 'paneer', 'mozzarella', 'parmesan', 'cheddar', 'feta', 'ricotta', 'halloumi', 'custard', 'kefir', 'lactose', 'casein', 'mascarpone', 'creme fraiche', 'buttermilk', 'brie', 'gouda', 'cheesy'],
  egg: ['egg', 'mayonnaise', 'mayo', 'aioli', 'meringue', 'omelette', 'omelet', 'frittata', 'quiche', 'custard'],
  peanut: ['peanut', 'groundnut'],
  treenut: ['almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut', 'pine nut', 'chestnut', 'marzipan', 'praline', 'nutella', 'nut', 'mixed nut'],
  soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari', 'natto'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'trout', 'mackerel', 'sardine', 'anchovy', 'anchovies', 'snapper', 'tilapia', 'barramundi', 'kingfish', 'herring', 'halibut', 'pollock', 'hoki', 'whitebait'],
  shellfish: ['prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'oyster', 'scallop', 'clam', 'calamari', 'squid', 'crayfish', 'langoustine', 'octopus', 'shellfish'],
  sesame: ['sesame', 'tahini', 'hummus', 'halva'],
};

const PORK = ['pork', 'bacon', 'ham', 'prosciutto', 'pancetta', 'lard', 'chorizo', 'salami', 'pepperoni', 'gammon'];
const MEAT = [...PORK, 'chicken', 'beef', 'lamb', 'turkey', 'duck', 'sausage', 'mince', 'steak', 'veal', 'venison', 'goat', 'meatball', 'brisket', 'rib', 'gelatin', 'gelatine', 'tallow', 'bone broth', 'jerky', 'hot dog'];
const ALCOHOL = ['wine', 'beer', 'rum', 'vodka', 'whisky', 'whiskey', 'brandy', 'sake', 'mirin', 'liqueur', 'cider', 'gin'];

// "Gluten-free pasta", "non-alcoholic beer" and the like are removed before any check.
const FREE_FROM = /(?:gluten|dairy|lactose|egg|soy|nut|peanut)[- ]free(?:\s+\w+)?|non[- ]dairy|non[- ]alcoholic(?:\s+\w+)?/g;

// Phrases that contain an allergen word but not the allergen (coconut milk is not dairy). Each exception applies to
// ONE check only: "peanut butter" is not dairy, but it must still be seen by the peanut check.
const SAFE = {
  gluten: [/rice (?:noodle|flour|paper|pasta)s?/g, /corn (?:tortilla|flour)s?/g, /cornflour/g, /(?:almond|coconut|chickpea|gram|buckwheat|rice) flour/g],
  dairy: [
    /(?:coconut|oat|soy|soya|rice|cashew|almond|nut|plant|vegan|hemp) (?:milk|cream|cheese|yoghurt|yogurt|butter)/g,
    /(?:peanut|almond|nut|cocoa|sunflower|apple|shea) butter/g,
    /butter ?(?:beans?|nut)/g,
    /cream of tartar/g,
  ],
  egg: [/egg ?plant/g, /vegan mayo(?:nnaise)?/g],
  meat: [/(?:vegan|veggie|vegetarian|meat[- ]free|plant[- ]based|lentil|soy|mushroom|jackfruit) (?:mince|sausage|burger|bacon|meatball|chicken|ham|jerky)s?/g],
};

const wordRegex = (words) => new RegExp(`\\b(?:${words.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})(?:es|s)?\\b`, 'i');
const ALLERGEN_REGEX = Object.fromEntries(Object.entries(ALLERGEN_WORDS).map(([id, words]) => [id, wordRegex(words)]));
const PORK_REGEX = wordRegex(PORK);
const MEAT_REGEX = wordRegex(MEAT);
const ALCOHOL_REGEX = wordRegex(ALCOHOL);
const HONEY_REGEX = wordRegex(['honey', 'gelatin', 'gelatine']);

const allergenWord = (id) => ALLERGENS.find((a) => a.id === id)?.word ?? id;

// The text we screen: the meal's name and every ingredient's name, with the "-free" wording removed.
const screenText = (meal) => `${meal.name} | ${(meal.ingredients ?? []).map((i) => i.name).join(' | ')}`.toLowerCase().replace(FREE_FROM, ' ');
const strip = (text, patterns = []) => patterns.reduce((t, p) => t.replace(p, ' '), text);

// { hard: reasons the meal breaks a diet or allergy (these are blocked), soft: foods on your avoid list }
export function mealFlags(meal, prefs) {
  const text = screenText(meal);
  const has = (id) => ALLERGEN_REGEX[id].test(strip(text, SAFE[id]));
  const meatText = strip(text, SAFE.meat);
  const meat = MEAT_REGEX.test(meatText);
  const fishy = has('fish') || has('shellfish');
  const hard = [];

  const broken = [];
  for (const diet of prefs.diets) {
    if (diet === 'vegan' && (meat || fishy || has('dairy') || has('egg') || HONEY_REGEX.test(text))) broken.push('vegan');
    else if (diet === 'vegetarian' && (meat || fishy)) broken.push('vegetarian');
    else if (diet === 'pescatarian' && meat) broken.push('pescatarian');
    else if (diet === 'halal' && (PORK_REGEX.test(meatText) || ALCOHOL_REGEX.test(text) || /\bgelatine?\b/.test(text))) broken.push('halal');
    else if (diet === 'kosher' && (PORK_REGEX.test(meatText) || has('shellfish') || (meat && has('dairy')))) broken.push('kosher');
  }
  // Vegan covers everything vegetarian says, so one reason is enough.
  for (const d of broken.includes('vegan') ? ['vegan', ...broken.filter((x) => x !== 'vegan' && x !== 'vegetarian')] : broken) {
    hard.push(d === 'halal' || d === 'kosher' ? `May not be ${d}` : `Not ${d}`);
  }
  for (const id of prefs.avoid) if (has(id)) hard.push(`Contains ${allergenWord(id)}`);

  const soft = prefs.dislikes.filter((t) => matchesTerm(text, t)).map((t) => `Contains ${t}`);
  return { hard: [...new Set(hard)], soft };
}
