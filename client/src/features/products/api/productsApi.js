import api from "../../../lib/api";

export const productsApi = {
  list: async (params) => {
    const response = await api.get("/products", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/products", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  bulkImport: async (data) => {
    const response = await api.post("/products/bulk-import", data);
    return response.data;
  },
};
