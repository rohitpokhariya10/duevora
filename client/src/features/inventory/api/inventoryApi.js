import api from "../../../lib/api";

export const inventoryApi = {
  // Inventory levels
  list: async (params) => {
    const response = await api.get("/inventory", { params });
    return response.data;
  },

  // Categories
  createCategory: async (data) => {
    const response = await api.post("/categories", data);
    return response.data;
  },

  listCategories: async (params) => {
    const response = await api.get("/categories", { params });
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Units
  createUnit: async (data) => {
    const response = await api.post("/units", data);
    return response.data;
  },

  listUnits: async (params) => {
    const response = await api.get("/units", { params });
    return response.data;
  },

  updateUnit: async (id, data) => {
    const response = await api.put(`/units/${id}`, data);
    return response.data;
  },

  deleteUnit: async (id) => {
    const response = await api.delete(`/units/${id}`);
    return response.data;
  },

  // Warehouses
  createWarehouse: async (data) => {
    const response = await api.post("/warehouses", data);
    return response.data;
  },

  listWarehouses: async (params) => {
    const response = await api.get("/warehouses", { params });
    return response.data;
  },

  updateWarehouse: async (id, data) => {
    const response = await api.put(`/warehouses/${id}`, data);
    return response.data;
  },

  deleteWarehouse: async (id) => {
    const response = await api.delete(`/warehouses/${id}`);
    return response.data;
  },

  // Stock Movements
  listStockMovements: async (params) => {
    const response = await api.get("/stock-movements", { params });
    return response.data;
  },

  // Stock Adjustments
  listStockAdjustments: async (params) => {
    const response = await api.get("/stock-adjustments", { params });
    return response.data;
  },

  createStockAdjustment: async (data) => {
    const response = await api.post("/stock-adjustments", data);
    return response.data;
  },

  approveStockAdjustment: async (id) => {
    const response = await api.post(`/stock-adjustments/${id}/approve`);
    return response.data;
  },

  // Stock Transfers
  listStockTransfers: async (params) => {
    const response = await api.get("/stock-transfers", { params });
    return response.data;
  },

  createStockTransfer: async (data) => {
    const response = await api.post("/stock-transfers", data);
    return response.data;
  },

  approveStockTransfer: async (id) => {
    const response = await api.post(`/stock-transfers/${id}/approve`);
    return response.data;
  },
};
