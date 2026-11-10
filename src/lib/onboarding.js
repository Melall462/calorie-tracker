// Setup is for people opening Nutrily for the first time. Anyone who already has saved data (from before the setup
// flow existed) should go straight to the app, so we look for any of Nutrily's own saved keys.
const KEYS = ['entries', 'goals', 'goal', 'weights', 'profile', 'meals', 'water', 'preferences'];

export function hasExistingData() {
  try {
    return KEYS.some((key) => localStorage.getItem(`nutrily:${key}`) !== null);
  } catch {
    return true; // storage blocked: do not trap anyone in setup
  }
}
