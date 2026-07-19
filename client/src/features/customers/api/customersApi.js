import api from "../../../lib/api";

export const customersApi = {
  list: async (params) => {
    const response = await api.get("/customers", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/customers", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  bulkImport: async (data) => {
    const response = await api.post("/customers/bulk-import", data);
    return response.data;
  },

  bulkDelete: async (ids) => {
    const response = await api.delete("/customers/bulk-delete", { data: { ids } });
    return response.data;
  },
};
