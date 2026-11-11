// Run with: npm test
// Tests the allergy and diet screen for meals (src/lib/mealSafety.js).
import { mealFlags } from '../src/lib/mealSafety.js';
import { EMPTY_PREFERENCES } from '../src/lib/preferences.js';
let fails = 0;
const ok = (n, c, extra = '') => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : extra); if (!c) fails++; };
const meal = (name, ...ings) => ({ name, ingredients: ings.map((n) => ({ name: n })) });
const P = (o) => ({ ...EMPTY_PREFERENCES, ...o });
const hard = (m, p) => mealFlags(m, p).hard;
const A = (id) => P({ avoid: [id] });

ok('plain meals have no flags', hard(meal('Rice bowl', 'Brown rice', 'Broccoli', 'Olive oil'), P({ diets: ['vegan'], avoid: ['gluten', 'dairy', 'egg', 'peanut', 'treenut', 'soy', 'fish', 'shellfish', 'sesame'] })).length === 0);
ok('dairy: cheese, butter, yoghurt, cream are caught', ['Cheddar cheese', 'Butter', 'Greek yoghurt', 'Double cream', 'Parmesan', 'Halloumi'].every((n) => hard(meal('Dish', n), A('dairy')).includes('Contains dairy')));
ok('dairy: coconut milk, oat milk, vegan cheese, peanut butter, butternut and cocoa butter are not dairy', ['Coconut milk', 'Oat milk', 'Vegan cheese', 'Peanut butter', 'Butternut squash', 'Cocoa butter', 'Coconut cream', 'Dairy-free yoghurt', 'Butter beans', 'Almond milk', 'Hemp milk'].every((n) => hard(meal('Dish', n), A('dairy')).length === 0));
ok('gluten: bread, pasta, soy sauce, oats, flour are caught', ['Wholemeal bread', 'Spaghetti', 'Soy sauce', 'Rolled oats', 'Plain flour', 'Couscous', 'Beer'].every((n) => hard(meal('Dish', n), A('gluten')).includes('Contains gluten')));
ok('gluten: gluten-free pasta, rice noodles, corn tortillas, almond flour, rice flour are fine', ['Gluten-free pasta', 'Rice noodles', 'Corn tortillas', 'Almond flour', 'Rice flour', 'Cornflour'].every((n) => hard(meal('Dish', n), A('gluten')).length === 0));
ok('egg: egg, mayo, omelette are caught; eggplant is not', hard(meal('Dish', 'Egg'), A('egg')).length === 1 && hard(meal('Omelette', 'x'), A('egg')).length === 1 && hard(meal('Dish', 'Mayonnaise'), A('egg')).length === 1 && hard(meal('Roast eggplant', 'Eggplant'), A('egg')).length === 0);
ok('peanut: peanuts, peanut butter and groundnut oil', ['Peanuts', 'Peanut butter', 'Groundnut oil'].every((n) => hard(meal('Dish', n), A('peanut')).length === 1));
ok('tree nuts: almonds, walnuts, mixed nuts, pine nuts; not coconut, nutmeg, peanuts', ['Almonds', 'Walnuts', 'Mixed nuts', 'Pine nuts', 'Cashews', 'Hazelnut spread'].every((n) => hard(meal('Dish', n), A('treenut')).length === 1) && ['Coconut flakes', 'Nutmeg', 'Peanuts', 'Donut'].every((n) => hard(meal('Dish', n), A('treenut')).length === 0));
ok('almond milk is a tree nut even though it is not dairy', hard(meal('Dish', 'Almond milk'), A('treenut')).length === 1 && hard(meal('Dish', 'Almond milk'), A('dairy')).length === 0);
ok('peanut butter is still a peanut when only dairy is excused', hard(meal('Dish', 'Peanut butter'), P({ avoid: ['peanut', 'dairy'] })).join() === 'Contains peanuts');
ok('soy: tofu, tempeh, miso, edamame', ['Firm tofu', 'Tempeh', 'Miso paste', 'Edamame'].every((n) => hard(meal('Dish', n), A('soy')).length === 1));
ok('fish: salmon, tuna, anchovies, fish sauce; shellfish is not fish', ['Salmon fillet', 'Tuna', 'Anchovies', 'Fish sauce'].every((n) => hard(meal('Dish', n), A('fish')).length === 1) && hard(meal('Dish', 'Prawns'), A('fish')).length === 0);
ok('shellfish: prawns, crab, mussels, squid; fish is not shellfish', ['Prawns', 'Crab meat', 'Mussels', 'Calamari'].every((n) => hard(meal('Dish', n), A('shellfish')).length === 1) && hard(meal('Dish', 'Salmon'), A('shellfish')).length === 0);
ok('sesame: seeds, oil, tahini, hummus', ['Sesame seeds', 'Sesame oil', 'Tahini', 'Hummus'].every((n) => hard(meal('Dish', n), A('sesame')).length === 1));
ok('allergen in the meal NAME alone is caught', hard(meal('Cheesy pasta bake', 'Tomato'), P({ avoid: ['dairy', 'gluten'] })).length === 2);
ok('plural and capital letters do not matter', hard(meal('DISH', 'EGGS', 'Walnuts'), P({ avoid: ['egg', 'treenut'] })).length === 2);

ok('vegetarian: meat and fish blocked, dairy and egg fine', ['Chicken breast', 'Beef mince', 'Bacon', 'Salmon', 'Prawns', 'Sausage'].every((n) => hard(meal('Dish', n), P({ diets: ['vegetarian'] })).includes('Not vegetarian')) && hard(meal('Dish', 'Cheese', 'Egg'), P({ diets: ['vegetarian'] })).length === 0);
ok('vegan: meat, fish, dairy, egg and honey all blocked, and only "Not vegan" is shown', hard(meal('Dish', 'Honey'), P({ diets: ['vegan'] })).join() === 'Not vegan' && hard(meal('Dish', 'Chicken'), P({ diets: ['vegan', 'vegetarian'] })).join() === 'Not vegan');
ok('vegan: tofu, lentils, coconut milk, vegan cheese and plant-based mince are fine', hard(meal('Dish', 'Tofu', 'Lentils', 'Coconut milk', 'Vegan cheese', 'Plant-based mince', 'Mushroom bacon'), P({ diets: ['vegan'] })).length === 0);
ok('pescatarian: meat blocked, fish allowed', hard(meal('Dish', 'Lamb'), P({ diets: ['pescatarian'] })).includes('Not pescatarian') && hard(meal('Dish', 'Salmon', 'Prawns'), P({ diets: ['pescatarian'] })).length === 0);
ok('halal: pork and alcohol are flagged as "May not be halal"', hard(meal('Dish', 'Bacon'), P({ diets: ['halal'] })).join() === 'May not be halal' && hard(meal('Dish', 'Red wine'), P({ diets: ['halal'] })).join() === 'May not be halal');
ok('halal: non-alcoholic drinks and veggie bacon are not flagged', hard(meal('Dish', 'Non-alcoholic beer'), P({ diets: ['halal'] })).length === 0 && hard(meal('Dish', 'Vegan bacon'), P({ diets: ['halal'] })).length === 0);
ok('halal: chicken and fish pass the screen (certification cannot be checked)', hard(meal('Dish', 'Chicken', 'Salmon'), P({ diets: ['halal'] })).length === 0);
ok('kosher: pork, shellfish, and meat with dairy are flagged', hard(meal('Dish', 'Ham'), P({ diets: ['kosher'] })).length === 1 && hard(meal('Dish', 'Prawns'), P({ diets: ['kosher'] })).length === 1 && hard(meal('Chicken parmesan', 'Chicken', 'Parmesan'), P({ diets: ['kosher'] })).length === 1 && hard(meal('Dish', 'Beef'), P({ diets: ['kosher'] })).length === 0);

const f = mealFlags(meal('Mushroom risotto', 'Mushrooms', 'Rice'), P({ dislikes: ['mushroom', 'liver'] }));
ok('foods you dislike are soft flags, not blocks', f.hard.length === 0 && f.soft.join() === 'Contains mushroom');
ok('no preferences means no flags at all', mealFlags(meal('Cheese omelette', 'Egg', 'Cheese'), EMPTY_PREFERENCES).hard.length === 0);
const multi = mealFlags(meal('Cheeseburger', 'Beef', 'Cheese', 'Bun'), P({ diets: ['vegetarian'], avoid: ['dairy', 'gluten'] })).hard;
ok('a meal can break several rules at once, each listed once', multi.length === 3 && multi.includes('Not vegetarian') && multi.includes('Contains dairy') && multi.includes('Contains gluten'), multi.join());
ok('missing ingredients never crash', mealFlags({ name: 'X' }, P({ avoid: ['dairy'] })).hard.length === 0);
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
