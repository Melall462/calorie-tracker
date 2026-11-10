// Calorie calculator: body stats in, a daily calorie target and macros out.
// Pure functions only (no React), so the maths is easy to read and test.
//
// Steps:
//   1. Resting energy (BMR): Mifflin-St Jeor, or Katch-McArdle if body fat % is given.
//   2. Maintenance calories (TDEE) = BMR x activity multiplier.
//   3. Add or subtract calories for the chosen pace. About 7,700 kcal is roughly 1 kg of body weight.
//   4. Apply safety limits, then split the calories into macros.
import { round1 } from './nutrition.js';

export const KCAL_PER_KG = 7700;

export const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'average', label: 'Average of the two' },
];

export const ACTIVITY = [
  { value: '1.2', label: 'Sedentary: desk job, little exercise' },
  { value: '1.375', label: 'Light: exercise 1 to 3 days a week' },
  { value: '1.55', label: 'Moderate: exercise 3 to 5 days a week' },
  { value: '1.725', label: 'Very active: hard exercise 6 to 7 days a week' },
  { value: '1.9', label: 'Extra active: physical job plus training' },
];

export const AIMS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Keep my weight' },
  { value: 'gain', label: 'Gain weight' },
];

export const PACES = {
  lose: [
    { value: '0.25', label: '0.25 kg a week (gentle)' },
    { value: '0.5', label: '0.5 kg a week (steady)' },
    { value: '0.75', label: '0.75 kg a week (faster)' },
    { value: '1', label: '1 kg a week (fastest, hard to keep up)' },
  ],
  gain: [
    { value: '0.25', label: '0.25 kg a week (lean gain)' },
    { value: '0.5', label: '0.5 kg a week (faster gain)' },
  ],
};

// Everything is kept as text so it works directly with form inputs.
export const DEFAULT_PROFILE = {
  sex: '',
  age: '',
  heightCm: '',
  weightKg: '',
  bodyFat: '',
  activity: '',
  aim: 'maintain',
  goalKg: '',
  pace: '0.5',
};

const MIN_CALORIES = { female: 1200, average: 1350, male: 1500 };
const BMI_UNDERWEIGHT = 18.5;
const MAX_LOSS_FRACTION = 0.01; // never plan to lose more than 1% of body weight a week

// Blank or invalid text becomes NaN (Number('') would wrongly be 0).
export function parse(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (text === '') return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

// Clean up whatever is in storage so a bad value can never crash the app.
export function cleanProfile(saved) {
  const out = { ...DEFAULT_PROFILE };
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(DEFAULT_PROFILE)) {
      const v = saved[key];
      if (typeof v === 'string' || typeof v === 'number') out[key] = String(v);
    }
  }
  if (!SEX_OPTIONS.some((o) => o.value === out.sex)) out.sex = '';
  if (!ACTIVITY.some((o) => o.value === out.activity)) out.activity = '';
  if (!AIMS.some((o) => o.value === out.aim)) out.aim = 'maintain';
  const knownPaces = Object.values(PACES).flat().map((o) => o.value);
  if (!knownPaces.includes(out.pace)) out.pace = '0.5';
  const paces = PACES[out.aim];
  if (paces && !paces.some((o) => o.value === out.pace)) out.pace = '0.5';
  return out;
}

// Mifflin-St Jeor, or Katch-McArdle when body fat % is known (better for very lean or muscular people).
export function restingEnergy({ sex, age, heightCm, weightKg, bodyFat }) {
  if (Number.isFinite(bodyFat)) return 370 + 21.6 * weightKg * (1 - bodyFat / 100);
  const sexConstant = { male: 5, female: -161, average: -78 }[sex];
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
}

export const bmi = (weightKg, heightCm) => weightKg / (heightCm / 100) ** 2;

// A simple split: protein by body weight (capped at 35% of calories), 25% of calories from fat, the rest carbs.
export function macroSplit(calories, weightKg, aim) {
  const perKg = aim === 'lose' ? 2.0 : aim === 'gain' ? 1.8 : 1.6;
  const protein = Math.round(Math.min(perKg * weightKg, (0.35 * calories) / 4));
  const fat = Math.round((0.25 * calories) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

// What is wrong with each field of the form, keyed by field name. An empty object means every field is fine.
// Both the calculator and the setup flow use this, so the two always agree on what counts as valid.
export function fieldErrors(profile) {
  const age = parse(profile.age);
  const heightCm = parse(profile.heightCm);
  const weightKg = parse(profile.weightKg);
  const goalKg = parse(profile.goalKg);
  const hasBodyFat = String(profile.bodyFat).trim() !== '';
  const bodyFat = hasBodyFat ? parse(profile.bodyFat) : NaN;
  const activity = parse(profile.activity);
  const e = {};

  if (!SEX_OPTIONS.some((o) => o.value === profile.sex)) e.sex = 'Choose an option for sex (the formula needs it).';
  if (age >= 1 && age < 18) e.age = "Nutrily's calculator is for adults (18 or over).";
  else if (!(age >= 18 && age <= 100)) e.age = 'Enter your age (18 to 100).';
  if (!(heightCm >= 120 && heightCm <= 230)) e.heightCm = 'Enter your height in cm (120 to 230).';
  if (!(weightKg >= 30 && weightKg <= 300)) e.weightKg = 'Enter your current weight in kg (30 to 300).';
  if (hasBodyFat && !(bodyFat >= 3 && bodyFat <= 60)) e.bodyFat = 'Body fat should be between 3% and 60%, or left blank.';
  if (!(activity >= 1.2)) e.activity = 'Choose your activity level.';

  if (profile.aim === 'lose' || profile.aim === 'gain') {
    if (!(goalKg >= 30 && goalKg <= 300)) e.goalKg = 'Enter your goal weight in kg (30 to 300).';
    else if (weightKg >= 30) {
      if (profile.aim === 'lose' && goalKg >= weightKg) e.goalKg = 'For weight loss, your goal weight needs to be lower than your current weight.';
      if (profile.aim === 'gain' && goalKg <= weightKg) e.goalKg = 'For weight gain, your goal weight needs to be higher than your current weight.';
    }
  }
  return e;
}

export function calculatePlan(profile, today = new Date()) {
  const age = parse(profile.age);
  const heightCm = parse(profile.heightCm);
  const weightKg = parse(profile.weightKg);
  const goalKg = parse(profile.goalKg);
  const hasBodyFat = String(profile.bodyFat).trim() !== '';
  const bodyFat = hasBodyFat ? parse(profile.bodyFat) : NaN;
  const activity = parse(profile.activity);
  const aim = profile.aim;

  // Under 18: calorie targets need a professional, so Nutrily does not calculate one.
  if (age >= 1 && age < 18) {
    return { ok: false, minor: true, errors: [] };
  }

  const errors = Object.values(fieldErrors(profile));
  if (errors.length) return { ok: false, minor: false, errors };

  const needsGoal = aim === 'lose' || aim === 'gain';

  // Weight-loss plans are not built for people who are already underweight, or aiming to become underweight.
  const currentBmi = bmi(weightKg, heightCm);
  if (aim === 'lose') {
    if (currentBmi < BMI_UNDERWEIGHT) {
      return {
        ok: false,
        minor: false,
        errors: ['Your BMI is already in the underweight range, so Nutrily will not build a weight-loss plan. Please talk to a doctor or dietitian.'],
      };
    }
    if (bmi(goalKg, heightCm) < BMI_UNDERWEIGHT) {
      return {
        ok: false,
        minor: false,
        errors: [
          'That goal weight is below the healthy BMI range for your height, so Nutrily will not plan towards it. Choose a higher goal weight, or talk to a doctor or dietitian.',
        ],
      };
    }
  }

  const warnings = [];
  const rawBmr = restingEnergy({ sex: profile.sex, age, heightCm, weightKg, bodyFat });
  const bmr = Math.round(rawBmr);
  const tdee = Math.round(rawBmr * activity);

  let requested = needsGoal ? parse(profile.pace) : 0;
  let pace = requested;
  if (aim === 'lose' && pace > weightKg * MAX_LOSS_FRACTION) {
    pace = Math.floor(weightKg * MAX_LOSS_FRACTION * 100) / 100;
    warnings.push(`Your pace was lowered to ${pace} kg a week, which is about 1% of your body weight. That is the most we suggest.`);
  }

  const dailyChange = aim === 'lose' ? (-pace * KCAL_PER_KG) / 7 : aim === 'gain' ? (pace * KCAL_PER_KG) / 7 : 0;
  let target = Math.round((tdee + dailyChange) / 10) * 10;

  if (aim === 'lose') {
    const floor = MIN_CALORIES[profile.sex];
    if (target < floor) {
      target = floor;
      warnings.push(
        `Your target was raised to ${floor.toLocaleString()} kcal, the lowest we suggest without medical supervision. At that level your loss will be slower than the pace you picked.`
      );
    }
  }

  const change = target - tdee;
  const paceKgWeek = Math.abs(change) * 7 / KCAL_PER_KG;
  if (aim === 'lose' && paceKgWeek < 0.15) {
    warnings.push('With your stats, the minimum intake leaves very little room to lose weight. More activity, or advice from a dietitian, may help.');
  }

  let weeks = null;
  let goalDate = null;
  if (needsGoal && paceKgWeek > 0.05) {
    weeks = Math.ceil(Math.abs(goalKg - weightKg) / paceKgWeek);
    goalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + weeks * 7);
  }

  return {
    ok: true,
    aim,
    formula: Number.isFinite(bodyFat) ? 'Katch-McArdle' : 'Mifflin-St Jeor',
    bmr,
    tdee,
    target,
    change,
    paceKgWeek: Math.round(paceKgWeek * 100) / 100,
    weeks,
    goalDate,
    bmi: round1(currentBmi),
    macros: macroSplit(target, weightKg, aim),
    warnings,
  };
}
