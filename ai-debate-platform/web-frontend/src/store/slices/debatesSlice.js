import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks for API calls
export const fetchDebates = createAsyncThunk(
  'debates/fetchDebates',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/debates', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch debates');
    }
  }
);

export const fetchDebateById = createAsyncThunk(
  'debates/fetchDebateById',
  async (debateId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/debates/${debateId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch debate');
    }
  }
);

export const createDebate = createAsyncThunk(
  'debates/createDebate',
  async (debateData, { rejectWithValue }) => {
    try {
      const response = await api.post('/debates', debateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create debate');
    }
  }
);

export const joinDebate = createAsyncThunk(
  'debates/joinDebate',
  async ({ debateId, role, userId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/debates/${debateId}/join`, { role, userId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to join debate');
    }
  }
);

export const updateDebate = createAsyncThunk(
  'debates/updateDebate',
  async ({ debateId, updates }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/debates/${debateId}`, updates);
      return { debateId, updates };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update debate');
    }
  }
);

export const deleteDebate = createAsyncThunk(
  'debates/deleteDebate',
  async (debateId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/debates/${debateId}`);
      return { debateId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete debate');
    }
  }
);

export const fetchDebateStats = createAsyncThunk(
  'debates/fetchDebateStats',
  async (debateId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/debates/${debateId}/stats`);
      return { debateId, stats: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch debate stats');
    }
  }
);

const initialState = {
  debates: [],
  currentDebate: null,
  debateStats: {},
  loading: false,
  error: null,
  pagination: {
    total: 0,
    limit: 20,
    offset: 0
  },
  filters: {
    status: '',
    isPublic: '',
    hasAIParticipant: ''
  }
};

const debatesSlice = createSlice({
  name: 'debates',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentDebate: (state) => {
      state.currentDebate = null;
    },
    updateCurrentDebateFromSocket: (state, action) => {
      if (state.currentDebate && state.currentDebate.id === action.payload.id) {
        state.currentDebate = { ...state.currentDebate, ...action.payload };
      }
    },
    addMessageToCurrentDebate: (state, action) => {
      if (state.currentDebate) {
        if (!state.currentDebate.messages) {
          state.currentDebate.messages = [];
        }
        state.currentDebate.messages.push(action.payload);
      }
    },
    addAnalysisToCurrentDebate: (state, action) => {
      if (state.currentDebate) {
        if (!state.currentDebate.analyses) {
          state.currentDebate.analyses = [];
        }
        state.currentDebate.analyses.push(action.payload);
      }
    },
    updateDebateInList: (state, action) => {
      const index = state.debates.findIndex(debate => debate.id === action.payload.id);
      if (index !== -1) {
        state.debates[index] = { ...state.debates[index], ...action.payload };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch debates
      .addCase(fetchDebates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDebates.fulfilled, (state, action) => {
        state.loading = false;
        state.debates = Array.isArray(action.payload.data) ? action.payload.data : [];
        state.pagination = action.payload.pagination || {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false
        };
      })
      .addCase(fetchDebates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch debate by ID
      .addCase(fetchDebateById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDebateById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDebate = action.payload.data;
      })
      .addCase(fetchDebateById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create debate
      .addCase(createDebate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDebate.fulfilled, (state, action) => {
        state.loading = false;
        state.debates.unshift(action.payload.data);
        state.currentDebate = action.payload.data;
      })
      .addCase(createDebate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Join debate
      .addCase(joinDebate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinDebate.fulfilled, (state, action) => {
        state.loading = false;
        // Update will come from socket
      })
      .addCase(joinDebate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update debate
      .addCase(updateDebate.fulfilled, (state, action) => {
        const { debateId, updates } = action.payload;
        const index = state.debates.findIndex(debate => debate.id === debateId);
        if (index !== -1) {
          state.debates[index] = { ...state.debates[index], ...updates };
        }
        if (state.currentDebate && state.currentDebate.id === debateId) {
          state.currentDebate = { ...state.currentDebate, ...updates };
        }
      })
      .addCase(updateDebate.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Delete debate
      .addCase(deleteDebate.fulfilled, (state, action) => {
        const debateId = action.payload.debateId;
        state.debates = state.debates.filter(debate => debate.id !== debateId);
        if (state.currentDebate && state.currentDebate.id === debateId) {
          state.currentDebate = null;
        }
      })
      .addCase(deleteDebate.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Fetch debate stats
      .addCase(fetchDebateStats.fulfilled, (state, action) => {
        const { debateId, stats } = action.payload;
        state.debateStats[debateId] = stats.data;
      })
      .addCase(fetchDebateStats.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setFilters,
  clearCurrentDebate,
  updateCurrentDebateFromSocket,
  addMessageToCurrentDebate,
  addAnalysisToCurrentDebate,
  updateDebateInList
} = debatesSlice.actions;

export default debatesSlice.reducer;
