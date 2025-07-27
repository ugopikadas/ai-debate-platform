// src/store/slices/usersSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
    },
  },
});

export const { setUser, setLoading, setError, logout } = usersSlice.actions;
export default usersSlice.reducer;
