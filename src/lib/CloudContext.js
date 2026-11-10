import { createContext, useContext } from 'react';

// Shares the account and sync state with any screen that needs it (Account, setup).
export const CloudContext = createContext({ available: false, loading: false, session: null });
export const useCloud = () => useContext(CloudContext);
