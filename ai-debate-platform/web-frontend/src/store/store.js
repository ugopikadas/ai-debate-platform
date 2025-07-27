import { configureStore } from '@reduxjs/toolkit';
import debatesReducer from './slices/debatesSlice';
import usersReducer from './slices/usersSlice';
import agentsReducer from './slices/agentsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    debates: debatesReducer,
    users: usersReducer,
    agents: agentsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
