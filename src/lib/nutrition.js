// Goals, limits and the maths for totals. Kept apart from the screens so it is easy to read and test.

export const MACROS = [
  { key: 'protein', label: 'Protein', color: 'var(--protein)' },
  { key: 'carbs', label: 'Carbs', color: 'var(--carbs)' },
  { key: 'fat', label: 'Fat', color: 'var(--fat)' },
];

export const DEFAULT_GOALS = { calories: 2000, protein: 120, carbs: 230, fat: 65, water: 2000 };

// [min, max] allowed for each goal. Stops a typo from producing nonsense.
export const LIMITS = {
  calories: [800, 6000],
  protein: [0, 1000],
  carbs: [0, 1000],
  fat: [0, 1000],
  water: [500, 6000], // millilitres
};

export const WATER_MAX = 10000; // ml per day, a sanity cap

// Clean up whatever is in storage: keep valid numbers, fall back to defaults for the rest.
export function sanitizeGoals(saved) {
  const goals = { ...DEFAULT_GOALS };
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(DEFAULT_GOALS)) {
      const value = Number(saved[key]);
      const [min, max] = LIMITS[key];
      if (Number.isFinite(value) && value >= min && value <= max) goals[key] = Math.round(value);
    }
  }
  return goals;
}

// Version 1 stored only a calorie number under "nutrily:goal". Carry it over so nothing is lost.
export function initialGoals() {
  try {
    const legacy = Number(JSON.parse(localStorage.getItem('nutrily:goal')));
    return sanitizeGoals({ calories: legacy });
  } catch {
    return { ...DEFAULT_GOALS };
  }
}

// Entries saved before macros existed have no protein/carbs/fat, so treat those as 0.
export function sumEntries(entries) {
  return entries.reduce(
    (total, e) => ({
      calories: total.calories + (e.calories || 0),
      protein: total.protein + (e.protein || 0),
      carbs: total.carbs + (e.carbs || 0),
      fat: total.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// 4 kcal per gram of protein and carbs, 9 per gram of fat.
export const macroCalories = ({ protein, carbs, fat }) => protein * 4 + carbs * 4 + fat * 9;

export const round1 = (n) => Math.round(n * 10) / 10;
export const percent = (value, goal) => (goal > 0 ? Math.min(100, (value / goal) * 100) : 0);
