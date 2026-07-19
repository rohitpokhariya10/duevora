import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { productsApi } from "../api/productsApi";

export const fetchProducts = createAsyncThunk(
  "products/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      return await productsApi.list(params);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch products");
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      return await productsApi.getById(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch product");
    }
  }
);

export const createProduct = createAsyncThunk(
  "products/create",
  async (data, { rejectWithValue }) => {
    try {
      return await productsApi.create(data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create product");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await productsApi.update(id, data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update product");
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id, { rejectWithValue }) => {
    try {
      return await productsApi.remove(id);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete product");
    }
  }
);

const productsSlice = createSlice({
  name: "products",
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
      .addCase(fetchProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload?.data;
        state.items = Array.isArray(payload) ? payload : payload?.data || [];
        state.total = payload?.total || state.items.length;
        state.totalPages = payload?.totalPages || 1;
      })
      .addCase(fetchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchProductById.pending, (state) => { state.loading = true; })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload?.data || action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createProduct.fulfilled, (state, action) => {
        const item = action.payload?.data || action.payload;
        state.items.unshift(item);
        state.total += 1;
      })
      .addCase(createProduct.rejected, (state, action) => { state.error = action.payload; })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const updated = action.payload?.data || action.payload;
        const idx = state.items.findIndex((i) => i._id === updated._id);
        if (idx !== -1) state.items[idx] = updated;
        if (state.selectedItem?._id === updated._id) state.selectedItem = updated;
      })
      .addCase(updateProduct.rejected, (state, action) => { state.error = action.payload; })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        const id = action.meta.arg;
        state.items = state.items.filter((i) => i._id !== id);
        state.total -= 1;
        if (state.selectedItem?._id === id) state.selectedItem = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearError, clearSelectedItem, setPage, setPageSize } = productsSlice.actions;
export default productsSlice.reducer;
