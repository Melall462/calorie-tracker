const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "meals.json");

const seedMeals = [
  {
    id: "seed-breakfast",
    category: "Breakfast",
    name: "Greek yogurt bowl",
    notes: "Granola, blueberries, chia seeds",
    calories: 420,
    protein: 32,
  },
  {
    id: "seed-lunch",
    category: "Lunch",
    name: "Chicken harvest salad",
    notes: "Chicken breast, quinoa, greens, avocado",
    calories: 610,
    protein: 44,
  },
  {
    id: "seed-snack",
    category: "Snack",
    name: "Protein latte",
    notes: "Espresso, whey, oat milk",
    calories: 210,
    protein: 27,
  },
  {
    id: "seed-dinner",
    category: "Dinner",
    name: "Salmon rice plate",
    notes: "Roasted salmon, jasmine rice, cucumber salad",
    calories: 480,
    protein: 35,
  },
];

const baseRecommendationCatalog = [
  {
    id: "chicken-burrito-bowl",
    tag: "High Protein",
    name: "Chicken burrito bowl",
    description: "Grilled chicken, rice, black beans, salsa, and crunchy lettuce.",
    calories: 540,
    protein: 46,
    ingredients: [
      "150g grilled chicken breast",
      "3/4 cup cooked rice",
      "1/2 cup black beans",
      "1/4 cup salsa",
      "1 cup shredded lettuce",
      "2 tbsp Greek yogurt or sour cream"
    ],
    instructions: [
      "Cook or reheat the rice and warm the black beans.",
      "Season chicken with salt, pepper, cumin, and paprika, then grill or pan-sear until cooked through.",
      "Slice the chicken and layer rice, beans, lettuce, salsa, and yogurt in a bowl.",
      "Finish with lime juice and any extra herbs before serving."
    ],
  },
  {
    id: "turkey-avocado-wrap",
    tag: "Light Lunch",
    name: "Turkey avocado wrap",
    description: "Turkey breast, avocado, greens, and mustard in a soft wrap.",
    calories: 430,
    protein: 33,
    ingredients: [
      "1 large whole-wheat wrap",
      "120g sliced turkey breast",
      "1/4 avocado",
      "1 handful mixed greens",
      "1 tbsp mustard",
      "Tomato slices"
    ],
    instructions: [
      "Spread mustard over the wrap.",
      "Layer turkey, avocado, greens, and tomato across the center.",
      "Fold the sides in and roll tightly.",
      "Slice in half and serve immediately."
    ],
  },
  {
    id: "protein-yogurt-parfait",
    tag: "Quick Snack",
    name: "Protein yogurt parfait",
    description: "Greek yogurt, berries, and a small granola sprinkle.",
    calories: 290,
    protein: 24,
    ingredients: [
      "1 cup Greek yogurt",
      "1/2 cup mixed berries",
      "2 tbsp granola",
      "1 tsp honey"
    ],
    instructions: [
      "Add half the yogurt to a glass or bowl.",
      "Layer in berries and granola.",
      "Top with the remaining yogurt and drizzle with honey."
    ],
  },
  {
    id: "salmon-quinoa-plate",
    tag: "Balanced Dinner",
    name: "Salmon quinoa plate",
    description: "Roasted salmon with quinoa, broccolini, and lemon dressing.",
    calories: 610,
    protein: 41,
    ingredients: [
      "150g salmon fillet",
      "3/4 cup cooked quinoa",
      "1 cup broccolini",
      "1 tbsp olive oil",
      "1/2 lemon",
      "Salt and pepper"
    ],
    instructions: [
      "Roast salmon at 200C until flaky, about 10 to 12 minutes.",
      "Steam or roast the broccolini until tender.",
      "Plate the quinoa with broccolini and top with salmon.",
      "Dress with olive oil, lemon juice, salt, and pepper."
    ],
  },
  {
    id: "beef-rice-stir-fry",
    tag: "Comfort Bowl",
    name: "Beef rice stir-fry",
    description: "Lean beef, mixed vegetables, jasmine rice, and teriyaki glaze.",
    calories: 670,
    protein: 38,
    ingredients: [
      "140g lean beef strips",
      "1 cup mixed stir-fry vegetables",
      "3/4 cup cooked jasmine rice",
      "2 tbsp teriyaki sauce",
      "1 tsp sesame oil"
    ],
    instructions: [
      "Sear the beef in a hot pan until browned.",
      "Add vegetables and cook until crisp-tender.",
      "Stir in teriyaki sauce and sesame oil.",
      "Serve over warm jasmine rice."
    ],
  },
  {
    id: "tofu-noodle-bowl",
    tag: "Vegetarian",
    name: "Tofu noodle bowl",
    description: "Crispy tofu, soba noodles, edamame, and sesame greens.",
    calories: 520,
    protein: 29,
    ingredients: [
      "180g firm tofu",
      "1 serving soba noodles",
      "1/2 cup edamame",
      "1 cup greens",
      "1 tbsp soy sauce",
      "1 tsp sesame seeds"
    ],
    instructions: [
      "Pan-fry tofu cubes until crisp on the edges.",
      "Cook soba noodles according to the packet and drain.",
      "Toss noodles with soy sauce, greens, and edamame.",
      "Top with tofu and sesame seeds."
    ],
  },
  {
    id: "egg-white-breakfast-tacos",
    tag: "Low Calorie",
    name: "Egg white breakfast tacos",
    description: "Egg whites, salsa, spinach, and corn tortillas.",
    calories: 340,
    protein: 27,
    ingredients: [
      "5 egg whites",
      "2 corn tortillas",
      "1 handful spinach",
      "2 tbsp salsa",
      "1 tbsp feta"
    ],
    instructions: [
      "Scramble the egg whites with spinach until just set.",
      "Warm the tortillas in a dry pan.",
      "Fill tortillas with the eggs, salsa, and feta.",
      "Serve hot."
    ],
  },
  {
    id: "cottage-cheese-fruit-bowl",
    tag: "Evening Snack",
    name: "Cottage cheese fruit bowl",
    description: "Cottage cheese, pineapple, kiwi, and cinnamon.",
    calories: 250,
    protein: 21,
    ingredients: [
      "3/4 cup cottage cheese",
      "1/2 cup pineapple chunks",
      "1 kiwi, sliced",
      "Pinch of cinnamon"
    ],
    instructions: [
      "Spoon cottage cheese into a bowl.",
      "Top with pineapple and kiwi.",
      "Dust lightly with cinnamon and serve."
    ],
  },
  {
    id: "shrimp-poke-bowl",
    tag: "Fresh Bowl",
    name: "Shrimp poke bowl",
    description: "Shrimp, sushi rice, cucumber, edamame, and spicy mayo drizzle.",
    calories: 560,
    protein: 39,
    ingredients: [
      "140g cooked shrimp",
      "3/4 cup sushi rice",
      "1/2 cup cucumber",
      "1/2 cup edamame",
      "1 tbsp spicy mayo",
      "1 sheet nori, sliced"
    ],
    instructions: [
      "Cook or reheat the sushi rice and let it cool slightly.",
      "Arrange rice, shrimp, cucumber, and edamame in a bowl.",
      "Drizzle with spicy mayo and top with sliced nori.",
      "Serve chilled or slightly warm."
    ],
  },
  {
    id: "steak-sweet-potato-plate",
    tag: "Recovery Meal",
    name: "Steak sweet potato plate",
    description: "Lean steak, roasted sweet potato wedges, and green beans.",
    calories: 640,
    protein: 47,
    ingredients: [
      "160g lean steak",
      "220g sweet potato",
      "1 cup green beans",
      "1 tbsp olive oil",
      "Salt, pepper, garlic powder"
    ],
    instructions: [
      "Roast the sweet potato wedges until caramelized.",
      "Season and sear the steak to your preferred doneness.",
      "Saute or steam the green beans until tender.",
      "Plate everything together and rest the steak before slicing."
    ],
  },
  {
    id: "tuna-pasta-salad",
    tag: "Meal Prep",
    name: "Tuna pasta salad",
    description: "Tuna, light pasta, peas, celery, and lemon yogurt dressing.",
    calories: 470,
    protein: 36,
    ingredients: [
      "1 can tuna in springwater",
      "1 cup cooked pasta",
      "1/3 cup peas",
      "1 celery stalk, diced",
      "2 tbsp Greek yogurt",
      "1 tsp lemon juice"
    ],
    instructions: [
      "Cook the pasta and cool it under cold water.",
      "Mix tuna, peas, and celery in a bowl.",
      "Stir in yogurt and lemon juice for the dressing.",
      "Fold through the pasta and chill before serving."
    ],
  },
  {
    id: "chicken-caesar-wrap",
    tag: "Grab and Go",
    name: "Chicken Caesar wrap",
    description: "Chicken breast, romaine, parmesan, and light Caesar dressing.",
    calories: 450,
    protein: 37,
    ingredients: [
      "1 whole-wheat wrap",
      "130g grilled chicken breast",
      "1 cup chopped romaine",
      "1 tbsp light Caesar dressing",
      "1 tbsp shaved parmesan"
    ],
    instructions: [
      "Warm the wrap briefly to make it flexible.",
      "Toss romaine with Caesar dressing.",
      "Add sliced chicken and parmesan to the wrap.",
      "Roll tightly and slice in half."
    ],
  },
  {
    id: "salmon-bagel-breakfast",
    tag: "Savory Breakfast",
    name: "Smoked salmon bagel",
    description: "Half bagel with smoked salmon, light cream cheese, and cucumber.",
    calories: 380,
    protein: 28,
    ingredients: [
      "1 plain bagel thin or half bagel",
      "70g smoked salmon",
      "1 tbsp light cream cheese",
      "Cucumber ribbons",
      "Black pepper"
    ],
    instructions: [
      "Toast the bagel until lightly crisp.",
      "Spread with cream cheese.",
      "Top with smoked salmon and cucumber ribbons.",
      "Finish with cracked black pepper."
    ],
  },
  {
    id: "banana-protein-oats",
    tag: "Breakfast",
    name: "Banana protein oats",
    description: "Creamy oats with whey, banana, cinnamon, and peanut drizzle.",
    calories: 430,
    protein: 31,
    ingredients: [
      "1/2 cup rolled oats",
      "1 scoop vanilla whey",
      "1 small banana",
      "1 tsp peanut butter",
      "Cinnamon"
    ],
    instructions: [
      "Cook the oats with water or milk until soft.",
      "Stir in the whey after removing from the heat.",
      "Top with sliced banana, cinnamon, and peanut butter.",
      "Serve warm."
    ],
  },
  {
    id: "turkey-chili-bowl",
    tag: "Comfort Food",
    name: "Turkey chili bowl",
    description: "Lean turkey chili with beans, tomato, and a spoon of yogurt.",
    calories: 520,
    protein: 43,
    ingredients: [
      "150g lean turkey mince",
      "1/2 cup kidney beans",
      "1/2 cup crushed tomato",
      "1/4 onion, diced",
      "2 tbsp Greek yogurt"
    ],
    instructions: [
      "Brown the turkey and onion in a pot.",
      "Add beans and crushed tomato and simmer until thick.",
      "Season with cumin, paprika, and chili flakes.",
      "Serve with yogurt on top."
    ],
  },
  {
    id: "halloumi-couscous-salad",
    tag: "Vegetarian",
    name: "Halloumi couscous salad",
    description: "Pan-seared halloumi with couscous, tomato, mint, and lemon.",
    calories: 510,
    protein: 24,
    ingredients: [
      "80g halloumi",
      "3/4 cup cooked couscous",
      "Cherry tomatoes",
      "Fresh mint",
      "1 tsp olive oil",
      "Lemon wedge"
    ],
    instructions: [
      "Pan-sear the halloumi until golden on both sides.",
      "Fluff the couscous and mix with tomatoes and mint.",
      "Top the salad with halloumi.",
      "Finish with olive oil and lemon."
    ],
  },
  {
    id: "chicken-noodle-soup",
    tag: "Light Comfort",
    name: "Chicken noodle soup",
    description: "Shredded chicken, noodles, vegetables, and clear broth.",
    calories: 360,
    protein: 30,
    ingredients: [
      "120g shredded chicken",
      "1 cup light noodles",
      "1 cup mixed soup vegetables",
      "2 cups chicken stock",
      "Parsley"
    ],
    instructions: [
      "Bring the stock to a gentle simmer.",
      "Add noodles and vegetables and cook until tender.",
      "Stir in the chicken to warm through.",
      "Finish with parsley and serve hot."
    ],
  },
  {
    id: "greek-chicken-pita",
    tag: "Mediterranean",
    name: "Greek chicken pita",
    description: "Chicken, tzatziki, tomato, lettuce, and cucumber in soft pita.",
    calories: 460,
    protein: 35,
    ingredients: [
      "1 pita bread",
      "130g grilled chicken",
      "2 tbsp tzatziki",
      "Tomato slices",
      "Cucumber",
      "Lettuce"
    ],
    instructions: [
      "Warm the pita until soft.",
      "Fill with chicken, tomato, cucumber, and lettuce.",
      "Spoon over tzatziki.",
      "Fold and serve immediately."
    ],
  },
  {
    id: "prawn-fried-rice",
    tag: "Takeout Style",
    name: "Prawn fried rice",
    description: "Prawns, rice, peas, egg, and soy in a quick skillet meal.",
    calories: 590,
    protein: 34,
    ingredients: [
      "140g prawns",
      "1 cup cooked rice",
      "1 egg",
      "1/2 cup peas",
      "1 tbsp soy sauce",
      "Spring onion"
    ],
    instructions: [
      "Scramble the egg in a hot pan and set aside.",
      "Cook prawns until pink.",
      "Add rice, peas, soy sauce, and egg back into the pan.",
      "Toss until heated through and top with spring onion."
    ],
  },
  {
    id: "beef-burger-bowl",
    tag: "Lower Carb",
    name: "Beef burger bowl",
    description: "Lean beef patty, roasted potatoes, pickles, lettuce, and burger sauce.",
    calories: 610,
    protein: 40,
    ingredients: [
      "150g lean beef mince",
      "180g baby potatoes",
      "Lettuce",
      "Pickles",
      "1 tbsp burger sauce"
    ],
    instructions: [
      "Roast the potatoes until crisp.",
      "Shape and sear the beef into a patty.",
      "Slice the patty and arrange over lettuce with pickles.",
      "Add potatoes and drizzle with burger sauce."
    ],
  },
  {
    id: "lentil-curry-bowl",
    tag: "Plant Based",
    name: "Lentil curry bowl",
    description: "Red lentil curry with spinach and basmati rice.",
    calories: 500,
    protein: 22,
    ingredients: [
      "3/4 cup cooked red lentils",
      "1/2 cup basmati rice",
      "1/2 cup light coconut milk",
      "1 cup spinach",
      "Curry paste"
    ],
    instructions: [
      "Simmer lentils with curry paste and coconut milk.",
      "Stir in spinach until wilted.",
      "Serve over basmati rice.",
      "Finish with coriander if you like."
    ],
  },
  {
    id: "protein-pancake-stack",
    tag: "Sweet Breakfast",
    name: "Protein pancake stack",
    description: "Protein pancakes topped with berries and yogurt.",
    calories: 410,
    protein: 32,
    ingredients: [
      "1 scoop vanilla whey",
      "1 egg",
      "1/3 cup oats",
      "1/4 cup Greek yogurt",
      "1/2 cup berries"
    ],
    instructions: [
      "Blend whey, egg, and oats into a batter.",
      "Cook small pancakes in a non-stick pan.",
      "Stack and top with yogurt and berries.",
      "Serve warm."
    ],
  },
  {
    id: "mexican-bean-bowl",
    tag: "Budget Meal",
    name: "Mexican bean bowl",
    description: "Rice, beans, corn, salsa, and avocado with lime.",
    calories: 480,
    protein: 20,
    ingredients: [
      "3/4 cup cooked rice",
      "1/2 cup black beans",
      "1/3 cup corn",
      "1/4 avocado",
      "Salsa",
      "Lime wedge"
    ],
    instructions: [
      "Warm the rice, beans, and corn.",
      "Layer them in a bowl with salsa and avocado.",
      "Finish with lime juice and seasoning.",
      "Serve immediately."
    ],
  },
  {
    id: "chicken-ramen-upgrade",
    tag: "Quick Dinner",
    name: "Chicken ramen upgrade",
    description: "Instant ramen boosted with chicken, egg, and greens.",
    calories: 540,
    protein: 35,
    ingredients: [
      "1 pack ramen noodles",
      "100g cooked chicken",
      "1 egg",
      "1 cup spinach",
      "Spring onion"
    ],
    instructions: [
      "Cook the ramen noodles in broth.",
      "Add spinach and sliced chicken during the final minute.",
      "Soft-boil or poach the egg.",
      "Serve with the egg and spring onion on top."
    ],
  },
  {
    id: "cajun-chicken-pasta",
    tag: "Pasta",
    name: "Cajun chicken pasta",
    description: "Chicken, pasta, peppers, and light creamy Cajun sauce.",
    calories: 650,
    protein: 44,
    ingredients: [
      "140g chicken breast",
      "1 cup cooked pasta",
      "1/2 cup sliced peppers",
      "2 tbsp light cream cheese",
      "Cajun seasoning"
    ],
    instructions: [
      "Cook the pasta and reserve a little pasta water.",
      "Season and cook the chicken until golden, then slice.",
      "Saute peppers and stir in cream cheese with pasta water.",
      "Toss through pasta and top with chicken."
    ],
  },
  {
    id: "egg-salad-toast",
    tag: "Simple Lunch",
    name: "Egg salad toast",
    description: "Egg salad on seeded toast with spinach and cracked pepper.",
    calories: 360,
    protein: 22,
    ingredients: [
      "2 boiled eggs",
      "2 slices seeded toast",
      "1 tbsp Greek yogurt",
      "Handful spinach",
      "Mustard and pepper"
    ],
    instructions: [
      "Mash the boiled eggs with yogurt and mustard.",
      "Toast the bread.",
      "Pile on spinach and egg salad.",
      "Finish with cracked pepper."
    ],
  },
  {
    id: "chicken-sushi-roll-bowl",
    tag: "Fusion",
    name: "Chicken sushi roll bowl",
    description: "Rice, teriyaki chicken, cucumber, carrot, and avocado with sesame.",
    calories: 570,
    protein: 39,
    ingredients: [
      "140g teriyaki chicken",
      "3/4 cup sushi rice",
      "Cucumber strips",
      "Carrot ribbons",
      "1/4 avocado",
      "Sesame seeds"
    ],
    instructions: [
      "Cook the sushi rice and let it cool slightly.",
      "Slice the chicken and prepare the vegetables.",
      "Arrange everything in a bowl over rice.",
      "Top with sesame seeds and serve."
    ],
  },
  {
    id: "yogurt-fruit-smoothie",
    tag: "Liquid Meal",
    name: "Yogurt fruit smoothie",
    description: "Greek yogurt smoothie with frozen berries, banana, and whey.",
    calories: 330,
    protein: 30,
    ingredients: [
      "3/4 cup Greek yogurt",
      "1/2 banana",
      "1/2 cup frozen berries",
      "1/2 scoop whey",
      "Water or milk"
    ],
    instructions: [
      "Add all ingredients to a blender.",
      "Blend until smooth.",
      "Adjust thickness with extra water or milk.",
      "Serve cold."
    ],
  },
  {
    id: "teriyaki-tofu-rice",
    tag: "Vegetarian",
    name: "Teriyaki tofu rice bowl",
    description: "Tofu, jasmine rice, broccoli, and a glossy teriyaki glaze.",
    calories: 540,
    protein: 27,
    ingredients: [
      "180g firm tofu",
      "3/4 cup jasmine rice",
      "1 cup broccoli",
      "2 tbsp teriyaki sauce",
      "1 tsp sesame oil"
    ],
    instructions: [
      "Bake or pan-fry the tofu until crisp.",
      "Steam the broccoli and cook the rice.",
      "Toss the tofu in teriyaki sauce.",
      "Serve over rice with broccoli."
    ],
  },
  {
    id: "chicken-gnocchi-skillet",
    tag: "Hearty Dinner",
    name: "Chicken gnocchi skillet",
    description: "Chicken, gnocchi, spinach, and light creamy sauce in one pan.",
    calories: 690,
    protein: 42,
    ingredients: [
      "140g chicken breast",
      "200g gnocchi",
      "1 cup spinach",
      "2 tbsp light cream",
      "Garlic"
    ],
    instructions: [
      "Cook gnocchi until tender and set aside.",
      "Sear the chicken pieces in a skillet.",
      "Add garlic, spinach, and cream, then return the gnocchi.",
      "Simmer briefly until glossy and combined."
    ],
  },
  {
    id: "chia-protein-pudding",
    tag: "Snack",
    name: "Chia protein pudding",
    description: "Chia pudding with protein powder and berry topping.",
    calories: 280,
    protein: 23,
    ingredients: [
      "2 tbsp chia seeds",
      "1/2 scoop protein powder",
      "3/4 cup milk",
      "Berries",
      "Vanilla"
    ],
    instructions: [
      "Whisk chia seeds, protein powder, milk, and vanilla together.",
      "Refrigerate until thickened.",
      "Top with berries before serving."
    ],
  },
  {
    id: "turkey-meatball-pita",
    tag: "Mediterranean",
    name: "Turkey meatball pita",
    description: "Turkey meatballs with pita, lettuce, tomato, and yogurt sauce.",
    calories: 520,
    protein: 37,
    ingredients: [
      "4 turkey meatballs",
      "1 pita bread",
      "Lettuce",
      "Tomato",
      "2 tbsp yogurt sauce"
    ],
    instructions: [
      "Warm the meatballs and pita.",
      "Fill the pita with lettuce and tomato.",
      "Add the meatballs and spoon over yogurt sauce.",
      "Serve while warm."
    ],
  },
  {
    id: "sardine-rice-toast",
    tag: "High Omega",
    name: "Sardine rice toast",
    description: "Sardines on rice toast with tomato and lemon.",
    calories: 340,
    protein: 25,
    ingredients: [
      "1 tin sardines",
      "2 rice cakes or rice toast slices",
      "Tomato slices",
      "Lemon wedge",
      "Black pepper"
    ],
    instructions: [
      "Top the rice cakes with sardines and tomato.",
      "Squeeze over lemon juice.",
      "Finish with black pepper and serve."
    ],
  },
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildGeneratedRecipes() {
  const proteins = [
    { name: "chicken", label: "Chicken", grams: 42, calories: 230, tag: "High Protein" },
    { name: "turkey", label: "Turkey", grams: 40, calories: 220, tag: "Lean Meal" },
    { name: "salmon", label: "Salmon", grams: 34, calories: 290, tag: "Omega Rich" },
    { name: "beef", label: "Beef", grams: 38, calories: 310, tag: "Recovery Meal" },
    { name: "tofu", label: "Tofu", grams: 26, calories: 240, tag: "Vegetarian" },
    { name: "shrimp", label: "Shrimp", grams: 36, calories: 200, tag: "Seafood" },
    { name: "tuna", label: "Tuna", grams: 37, calories: 210, tag: "Meal Prep" },
    { name: "eggs", label: "Eggs", grams: 24, calories: 220, tag: "Breakfast" },
  ];

  const bases = [
    { name: "rice bowl", label: "rice bowl", calories: 220, ingredients: ["3/4 cup cooked rice", "1 cup mixed vegetables"] },
    { name: "pasta skillet", label: "pasta skillet", calories: 260, ingredients: ["1 cup cooked pasta", "1/2 cup vegetables"] },
    { name: "wrap", label: "wrap", calories: 180, ingredients: ["1 whole-wheat wrap", "lettuce and tomato"] },
    { name: "salad plate", label: "salad plate", calories: 120, ingredients: ["2 cups salad greens", "crunchy vegetables"] },
    { name: "noodle bowl", label: "noodle bowl", calories: 240, ingredients: ["1 serving noodles", "1 cup greens"] },
    { name: "quinoa plate", label: "quinoa plate", calories: 210, ingredients: ["3/4 cup quinoa", "1 cup roasted vegetables"] },
    { name: "pita pocket", label: "pita pocket", calories: 190, ingredients: ["1 pita bread", "fresh chopped salad"] },
    { name: "sweet potato bowl", label: "sweet potato bowl", calories: 230, ingredients: ["220g roasted sweet potato", "1 cup greens"] },
  ];

  const flavors = [
    {
      name: "Mediterranean",
      extraCalories: 40,
      description: "with cucumber, tomato, herbs, and lemon yogurt sauce.",
      ingredients: ["cucumber", "tomato", "lemon yogurt sauce", "fresh herbs"],
      steps: [
        "Prepare the base and cook the protein until done.",
        "Chop the vegetables and herbs.",
        "Assemble everything and spoon over the lemon yogurt sauce.",
      ],
    },
    {
      name: "Korean BBQ",
      extraCalories: 70,
      description: "with pickled vegetables, sesame greens, and a sticky soy glaze.",
      ingredients: ["pickled vegetables", "sesame greens", "soy glaze"],
      steps: [
        "Cook the protein with garlic, soy, and a little sweetness.",
        "Prepare the base and quick-pickle the vegetables.",
        "Assemble the bowl and finish with sesame seeds.",
      ],
    },
    {
      name: "Mexican Street",
      extraCalories: 55,
      description: "with charred corn, salsa, lime, and creamy avocado topping.",
      ingredients: ["charred corn", "salsa", "lime", "avocado topping"],
      steps: [
        "Season and cook the protein with cumin and paprika.",
        "Warm the base and prep the corn salsa mix.",
        "Finish with lime and the creamy avocado topping.",
      ],
    },
    {
      name: "Thai Chili",
      extraCalories: 60,
      description: "with crunchy vegetables, chili-lime dressing, and herbs.",
      ingredients: ["shredded carrot", "capsicum", "chili-lime dressing", "fresh herbs"],
      steps: [
        "Cook the protein with garlic and chili.",
        "Prepare the base and slice the vegetables thinly.",
        "Toss with herbs and spoon over the chili-lime dressing.",
      ],
    },
    {
      name: "Creamy Garlic",
      extraCalories: 85,
      description: "with spinach, garlic sauce, and roasted vegetables.",
      ingredients: ["spinach", "garlic sauce", "roasted vegetables"],
      steps: [
        "Cook the protein and roast or saute the vegetables.",
        "Stir together a quick garlic sauce.",
        "Layer everything together and spoon the sauce over the top.",
      ],
    },
    {
      name: "Smoky BBQ",
      extraCalories: 65,
      description: "with slaw, smoky sauce, and roasted peppers.",
      ingredients: ["slaw mix", "smoky BBQ sauce", "roasted peppers"],
      steps: [
        "Cook the protein with smoky spices.",
        "Prepare the base and toss the slaw lightly.",
        "Serve with BBQ sauce and roasted peppers on top.",
      ],
    },
  ];

  const generated = [];

  proteins.forEach((protein) => {
    bases.forEach((base) => {
      flavors.forEach((flavor) => {
        const id = slugify(`${flavor.name} ${protein.name} ${base.name}`);
        const calories = protein.calories + base.calories + flavor.extraCalories;
        const description = `${flavor.name} ${protein.label.toLowerCase()} ${base.label} ${flavor.description}`;
        generated.push({
          id,
          tag: flavor.name,
          name: `${flavor.name} ${protein.label} ${base.label}`,
          description,
          calories,
          protein: protein.grams,
          ingredients: [
            `${protein.label} portion`,
            ...base.ingredients,
            ...flavor.ingredients,
          ],
          instructions: [
            ...flavor.steps,
            "Taste, adjust seasoning, and serve fresh.",
          ],
        });
      });
    });
  });

  return generated;
}

const generatedRecommendationCatalog = buildGeneratedRecipes();
const recommendationCatalog = [...baseRecommendationCatalog, ...generatedRecommendationCatalog];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, sessions: {} }, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  const store = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  if (!store.users) {
    const legacyMeals = Array.isArray(store.meals) ? store.meals : [];
    const legacyWaterMl = Number.isFinite(store.waterMl) ? store.waterMl : 0;
    store.users = {
      "demo-user": {
        id: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
        passwordHash: hashPassword("password"),
        profile: defaultProfile(),
        meals: legacyMeals,
        waterMl: legacyWaterMl,
      },
    };
    delete store.meals;
    delete store.waterMl;
  }

  if (!store.sessions) {
    store.sessions = {};
  }

  Object.values(store.users).forEach((user) => {
    if (!Array.isArray(user.meals)) {
      user.meals = [];
    }

    if (!Number.isFinite(user.waterMl)) {
      user.waterMl = 0;
    }

    if (!user.profile) {
      user.profile = defaultProfile();
    }
  });

  return store;
}

function defaultProfile() {
  return {
    onboardingComplete: false,
    age: 25,
    sex: "prefer-not-to-say",
    heightCm: 175,
    weightKg: 75,
    activityLevel: "moderate",
    goal: "maintain",
    dietaryRestrictions: [],
    allergies: "",
    preferredMeals: "balanced",
    goals: {
      calories: 2400,
      protein: 150,
      carbs: 220,
      fat: 75,
      waterLiters: 2.5,
    },
  };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getAuthedUser(request, store) {
  const token = getToken(request);
  const userId = store.sessions[token];
  return userId ? store.users[userId] : null;
}

function sendAuthRequired(response) {
  sendJson(response, 401, { error: "Login required." });
}

function profileFromInput(input) {
  const heightCm = Number(input.heightCm);
  const weightKg = Number(input.weightKg);
  const age = Number(input.age);
  const activityLevel = input.activityLevel || "moderate";
  const goal = input.goal || "maintain";
  const sex = input.sex || "prefer-not-to-say";
  const restrictions = Array.isArray(input.dietaryRestrictions) ? input.dietaryRestrictions : [];
  const allergies = typeof input.allergies === "string" ? input.allergies.trim() : "";
  const preferredMeals = typeof input.preferredMeals === "string" ? input.preferredMeals.trim() : "balanced";

  const safeHeight = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 175;
  const safeWeight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 75;
  const safeAge = Number.isFinite(age) && age > 0 ? age : 25;
  const bmr =
    sex === "female"
      ? 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge - 161
      : 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + 5;
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  };
  const goalAdjustments = {
    lose: -400,
    maintain: 0,
    gain: 300,
    muscle: 200,
  };
  const calories = Math.max(
    1400,
    Math.round((bmr * (activityMultipliers[activityLevel] || 1.55) + (goalAdjustments[goal] || 0)) / 50) * 50
  );
  const proteinMultiplier = goal === "muscle" || goal === "gain" ? 2 : goal === "lose" ? 1.8 : 1.6;
  const protein = Math.round(safeWeight * proteinMultiplier);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  const waterLiters = Math.max(2, Math.round((safeWeight * 35) / 100) / 10);

  return {
    onboardingComplete: true,
    age: safeAge,
    sex,
    heightCm: safeHeight,
    weightKg: safeWeight,
    activityLevel,
    goal,
    dietaryRestrictions: restrictions,
    allergies,
    preferredMeals,
    goals: {
      calories,
      protein,
      carbs,
      fat,
      waterLiters,
    },
  };
}

function normalizeMeal(meal, id) {
  return {
    id,
    category: meal.category.trim(),
    name: meal.name.trim(),
    notes: meal.notes.trim(),
    calories: Number(meal.calories),
    protein: Number(meal.protein),
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function validateMeal(meal) {
  return (
    meal &&
    typeof meal.category === "string" &&
    typeof meal.name === "string" &&
    typeof meal.notes === "string" &&
    Number.isFinite(meal.calories) &&
    Number.isFinite(meal.protein)
  );
}

function matchesDiet(meal, profile = defaultProfile()) {
  const restrictions = new Set(profile.dietaryRestrictions || []);
  const text = `${meal.name} ${meal.description} ${meal.ingredients.join(" ")}`.toLowerCase();
  const allergyTerms = String(profile.allergies || "")
    .toLowerCase()
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  if (allergyTerms.some((term) => text.includes(term))) {
    return false;
  }

  if (restrictions.has("vegetarian") && /(chicken|turkey|salmon|beef|shrimp|prawn|tuna|sardine|steak)/.test(text)) {
    return false;
  }

  if (restrictions.has("vegan") && /(chicken|turkey|salmon|beef|shrimp|prawn|tuna|sardine|steak|egg|yogurt|cheese|halloumi|milk|cream)/.test(text)) {
    return false;
  }

  if (restrictions.has("dairy-free") && /(yogurt|cheese|halloumi|milk|cream|feta)/.test(text)) {
    return false;
  }

  if (restrictions.has("gluten-free") && /(pasta|wrap|pita|bagel|toast|noodle|gnocchi|couscous|ramen)/.test(text)) {
    return false;
  }

  return true;
}

function buildRecommendations(remainingCalories, remainingProtein, seed = 0, excludeIds = [], profile = defaultProfile()) {
  const excludeSet = new Set(excludeIds);
  const availableCatalog = recommendationCatalog.filter((meal) => matchesDiet(meal, profile));
  const scored = availableCatalog.map((meal) => {
    const calorieDiff = Math.abs(remainingCalories - meal.calories);
    const proteinGap = Math.max(remainingProtein - meal.protein, 0);
    const overPenalty = meal.calories > remainingCalories ? (meal.calories - remainingCalories) * 1.6 : 0;
    const proteinBonus = Math.min(meal.protein, Math.max(remainingProtein, 20)) * 2;
    const sourceBonus = baseRecommendationCatalog.some((entry) => entry.id === meal.id) ? 18 : 0;
    const noveltyPenalty = excludeSet.has(meal.id) ? 120 : 0;
    const score = proteinBonus - calorieDiff - overPenalty - proteinGap * 3 + sourceBonus - noveltyPenalty;

    let reason = `Fits comfortably into your remaining ${remainingCalories} kcal.`;

    if (meal.protein >= remainingProtein && remainingProtein > 0) {
      reason = `This can nearly finish your remaining protein target in one meal.`;
    } else if (meal.calories <= remainingCalories) {
      reason = `This keeps you inside your calorie budget while adding ${meal.protein}g of protein.`;
    } else {
      reason = `Slightly above your remaining calories, but strong if you want a more filling option.`;
    }

    return {
      ...meal,
      score,
      reason,
    };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);
  const handWrittenRanked = ranked.filter((meal) => baseRecommendationCatalog.some((entry) => entry.id === meal.id));
  const generatedRanked = ranked.filter((meal) => !baseRecommendationCatalog.some((entry) => entry.id === meal.id));

  const handPool = handWrittenRanked.slice(0, Math.min(10, handWrittenRanked.length));
  const generatedPool = generatedRanked.slice(0, Math.min(20, generatedRanked.length));

  const handPick = handPool.length > 0 ? handPool[seed % handPool.length] : null;
  const generatedPickA = generatedPool.length > 0 ? generatedPool[seed % generatedPool.length] : null;
  const generatedPickB = generatedPool.length > 1 ? generatedPool[(seed + 5) % generatedPool.length] : null;

  const mixed = [handPick, generatedPickA, generatedPickB].filter(Boolean);
  const seen = new Set();
  const uniqueMixed = mixed.filter((meal) => {
    if (seen.has(meal.id)) {
      return false;
    }

    seen.add(meal.id);
    return true;
  });

  const fallbackPool = ranked.filter((meal) => !seen.has(meal.id)).slice(0, 12);
  const recommendations = [...uniqueMixed, ...fallbackPool].slice(0, 3).map(({ score, ...meal }) => meal);

  const summary =
    remainingCalories > 0
      ? `These meal ideas are ranked for your remaining ${remainingCalories} calories and ${remainingProtein}g of protein.`
      : `You are out of remaining calories, so these are the lightest high-protein options available.`;

  return {
    summary,
    recommendations,
  };
}

function serveStatic(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    response.end(buffer);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/signup" && request.method === "POST") {
    try {
      const payload = await parseBody(request);
      const name = String(payload.name || "").trim();
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");

      if (!name || !email || password.length < 6) {
        sendJson(response, 400, { error: "Name, email, and a 6+ character password are required." });
        return;
      }

      const store = readStore();
      const existing = Object.values(store.users).find((user) => user.email === email);

      if (existing) {
        sendJson(response, 409, { error: "An account already exists for that email." });
        return;
      }

      const userId = `user-${Date.now()}`;
      const token = createToken();
      const user = {
        id: userId,
        name,
        email,
        passwordHash: hashPassword(password),
        profile: defaultProfile(),
        meals: [],
        waterMl: 0,
      };

      store.users[userId] = user;
      store.sessions[token] = userId;
      writeStore(store);
      sendJson(response, 201, { token, user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not create account." });
    }

    return;
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    try {
      const payload = await parseBody(request);
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const store = readStore();
      const user = Object.values(store.users).find((entry) => entry.email === email);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendJson(response, 401, { error: "Invalid email or password." });
        return;
      }

      const token = createToken();
      store.sessions[token] = user.id;
      writeStore(store);
      sendJson(response, 200, { token, user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not log in." });
    }

    return;
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    const store = readStore();
    const user = getAuthedUser(request, store);

    if (!user) {
      sendAuthRequired(response);
      return;
    }

    sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    return;
  }

  if (url.pathname === "/api/onboarding" && request.method === "POST") {
    try {
      const store = readStore();
      const user = getAuthedUser(request, store);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      const payload = await parseBody(request);
      user.profile = profileFromInput(payload);
      writeStore(store);
      sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not save onboarding." });
    }

    return;
  }

  if (url.pathname === "/api/logout" && request.method === "POST") {
    const store = readStore();
    const token = getToken(request);
    delete store.sessions[token];
    writeStore(store);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/meals" && request.method === "GET") {
    const store = readStore();
    const user = getAuthedUser(request, store);

    if (!user) {
      sendAuthRequired(response);
      return;
    }

    sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    return;
  }

  if (url.pathname === "/api/meals" && request.method === "POST") {
    try {
      const store = readStore();
      const user = getAuthedUser(request, store);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      const meal = await parseBody(request);

      if (!validateMeal(meal)) {
        sendJson(response, 400, { error: "Invalid meal payload." });
        return;
      }

      user.meals.push(normalizeMeal(meal, `meal-${Date.now()}`));
      writeStore(store);
      sendJson(response, 201, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not save meal data." });
    }

    return;
  }

  if (url.pathname.startsWith("/api/meals/") && request.method === "PUT") {
    try {
      const store = readStore();
      const user = getAuthedUser(request, store);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      const mealId = url.pathname.split("/").pop();
      const meal = await parseBody(request);

      if (!validateMeal(meal)) {
        sendJson(response, 400, { error: "Invalid meal payload." });
        return;
      }

      const mealIndex = user.meals.findIndex((entry) => entry.id === mealId);

      if (mealIndex === -1) {
        sendJson(response, 404, { error: "Meal not found." });
        return;
      }

      user.meals[mealIndex] = normalizeMeal(meal, mealId);
      writeStore(store);
      sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not update meal data." });
    }

    return;
  }

  if (url.pathname.startsWith("/api/meals/") && request.method === "DELETE") {
    try {
      const store = readStore();
      const user = getAuthedUser(request, store);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      const mealId = url.pathname.split("/").pop();
      const nextMeals = user.meals.filter((entry) => entry.id !== mealId);

      if (nextMeals.length === user.meals.length) {
        sendJson(response, 404, { error: "Meal not found." });
        return;
      }

      user.meals = nextMeals;
      writeStore(store);
      sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not delete meal data." });
    }

    return;
  }

  if (url.pathname === "/api/recommendations" && request.method === "GET") {
    const store = readStore();
    const user = getAuthedUser(request, store);
    const remainingCalories = Number(url.searchParams.get("remainingCalories") || 0);
    const remainingProtein = Number(url.searchParams.get("remainingProtein") || 0);
    const seed = Number(url.searchParams.get("seed") || 0);
    const excludeIds = (url.searchParams.get("exclude") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    sendJson(response, 200, buildRecommendations(remainingCalories, remainingProtein, seed, excludeIds, user?.profile));
    return;
  }

  if (url.pathname === "/api/water" && request.method === "POST") {
    try {
      const store = readStore();
      const user = getAuthedUser(request, store);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      const payload = await parseBody(request);
      const amountMl = Number(payload.amountMl);

      if (!Number.isFinite(amountMl) || amountMl <= 0) {
        sendJson(response, 400, { error: "Invalid water amount." });
        return;
      }

      user.waterMl += amountMl;
      writeStore(store);
      sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not update water data." });
    }

    return;
  }

  if (url.pathname === "/api/water/reset" && request.method === "POST") {
    try {
      const store = readStore();
      const user = getAuthedUser(request, store);

      if (!user) {
        sendAuthRequired(response);
        return;
      }

      user.waterMl = 0;
      writeStore(store);
      sendJson(response, 200, { user: publicUser(user), meals: user.meals, waterMl: user.waterMl });
    } catch (error) {
      sendJson(response, 500, { error: "Could not reset water data." });
    }

    return;
  }

  serveStatic(url.pathname, response);
});

ensureDataFile();
server.listen(PORT, HOST, () => {
  console.log(`Calorie Canvas server running at http://${HOST}:${PORT}`);
});
