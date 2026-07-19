import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { vendorsApi } from "../api/vendorsApi";

export const fetchVendors = createAsyncThunk(
  "vendors/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      return await vendorsApi.list(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch vendors");
    }
  }
);

export const fetchVendorById = createAsyncThunk(
  "vendors/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await vendorsApi.getById(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch vendor");
    }
  }
);

export const createVendor = createAsyncThunk(
  "vendors/create",
  async (data, { rejectWithValue }) => {
    try {
      return await vendorsApi.create(data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create vendor");
    }
  }
);

export const updateVendor = createAsyncThunk(
  "vendors/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await vendorsApi.update(id, data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update vendor");
    }
  }
);

export const deleteVendor = createAsyncThunk(
  "vendors/delete",
  async (id, { rejectWithValue }) => {
    try {
      return await vendorsApi.remove(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete vendor");
    }
  }
);

const vendorsSlice = createSlice({
  name: "vendors",
  initialState: {
    items: [],
    selectedItem: null,
    loading: false,
    error: null,
    total: 0,
    page: 1,
    totalPages: 1,
    pageSize: 10,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearSelectedItem: (state) => { state.selectedItem = null; },
    setPage: (state, action) => { state.page = action.payload; },
    setPageSize: (state, action) => { state.pageSize = action.payload; state.page = 1; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload?.data;
        state.items = Array.isArray(payload) ? payload : payload?.data || [];
        state.total = payload?.total || state.items.length;
        state.totalPages = payload?.totalPages || 1;
      })
      .addCase(fetchVendors.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchVendorById.pending, (state) => { state.loading = true; })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload?.data || action.payload;
      })
      .addCase(fetchVendorById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createVendor.fulfilled, (state, action) => {
        const item = action.payload?.data || action.payload;
        state.items.unshift(item);
        state.total += 1;
      })
      .addCase(createVendor.rejected, (state, action) => { state.error = action.payload; })
      .addCase(updateVendor.fulfilled, (state, action) => {
        const updated = action.payload?.data || action.payload;
        const idx = state.items.findIndex((i) => i._id === updated._id);
        if (idx !== -1) state.items[idx] = updated;
        if (state.selectedItem?._id === updated._id) state.selectedItem = updated;
      })
      .addCase(updateVendor.rejected, (state, action) => { state.error = action.payload; })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        const id = action.meta.arg;
        state.items = state.items.filter((i) => i._id !== id);
        state.total -= 1;
        if (state.selectedItem?._id === id) state.selectedItem = null;
      })
      .addCase(deleteVendor.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearError, clearSelectedItem, setPage, setPageSize } = vendorsSlice.actions;
export default vendorsSlice.reducer;
