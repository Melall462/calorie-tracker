import { createContext, useContext } from 'react';

// Lets the scan and search screens read and update the person's saved foods without passing them through every component.
// The default does nothing, so a screen used on its own (or in a test) still works.
export const NO_FOODS = { foods: [], remember() {}, forget() {}, touch() {}, byCode: () => null };
export const FoodsContext = createContext(NO_FOODS);
export const useFoods = () => useContext(FoodsContext);
