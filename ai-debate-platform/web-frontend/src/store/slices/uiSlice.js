import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: false,
  theme: 'light',
  notifications: [],
  loading: {
    global: false,
    debates: false,
    agents: false,
    users: false
  },
  errors: {
    global: null,
    debates: null,
    agents: null,
    users: null
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setLoading: (state, action) => {
      const { section, loading } = action.payload;
      state.loading[section] = loading;
    },
    setError: (state, action) => {
      const { section, error } = action.payload;
      state.errors[section] = error;
    },
    clearError: (state, action) => {
      const section = action.payload;
      state.errors[section] = null;
    },
    clearAllErrors: (state) => {
      state.errors = {
        global: null,
        debates: null,
        agents: null,
        users: null
      };
    }
  }
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
  setError,
  clearError,
  clearAllErrors
} = uiSlice.actions;

export default uiSlice.reducer;
