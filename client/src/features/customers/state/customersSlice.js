import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { customersApi } from "../api/customersApi";

export const fetchCustomers = createAsyncThunk(
  "customers/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      return await customersApi.list(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch customers");
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  "customers/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await customersApi.getById(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch customer");
    }
  }
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (data, { rejectWithValue }) => {
    try {
      return await customersApi.create(data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create customer");
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await customersApi.update(id, data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update customer");
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/delete",
  async (id, { rejectWithValue }) => {
    try {
      return await customersApi.remove(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete customer");
    }
  }
);

export const bulkDeleteCustomers = createAsyncThunk(
  "customers/bulkDelete",
  async (ids, { rejectWithValue }) => {
    try {
      return await customersApi.bulkDelete(ids);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete customers");
    }
  }
);

const customersSlice = createSlice({
  name: "customers",
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
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedItem: (state) => {
      state.selectedItem = null;
    },
    setPage: (state, action) => {
      state.page = action.payload;
    },
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload?.data;
        state.items = Array.isArray(payload) ? payload : payload?.data || [];
        state.total = payload?.total || state.items.length;
        state.totalPages = payload?.totalPages || 1;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch by ID
      .addCase(fetchCustomerById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload?.data || action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createCustomer.fulfilled, (state, action) => {
        const item = action.payload?.data || action.payload;
        state.items.unshift(item);
        state.total += 1;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Update
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const updated = action.payload?.data || action.payload;
        const idx = state.items.findIndex((i) => i._id === updated._id);
        if (idx !== -1) state.items[idx] = updated;
        if (state.selectedItem?._id === updated._id) state.selectedItem = updated;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        const id = action.meta.arg;
        state.items = state.items.filter((i) => i._id !== id);
        state.total -= 1;
        if (state.selectedItem?._id === id) state.selectedItem = null;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Bulk delete
      .addCase(bulkDeleteCustomers.fulfilled, (state, action) => {
        const ids = action.meta.arg;
        state.items = state.items.filter((i) => !ids.includes(i._id));
        state.total -= ids.length;
      })
      .addCase(bulkDeleteCustomers.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSelectedItem, setPage, setPageSize } = customersSlice.actions;
export default customersSlice.reducer;
