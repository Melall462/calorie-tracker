import { createContext, useContext } from 'react';
import { EMPTY_PREFERENCES } from './preferences.js';

// Lets the search and scan screens read the person's food preferences without passing them through every component.
export const PreferencesContext = createContext(EMPTY_PREFERENCES);
export const usePreferences = () => useContext(PreferencesContext);
