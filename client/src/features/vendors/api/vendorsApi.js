import api from "../../../lib/api";

export const vendorsApi = {
  list: async (params) => {
    const response = await api.get("/vendors", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/vendors", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/vendors/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  },

  bulkImport: async (data) => {
    const response = await api.post("/vendors/bulk-import", data);
    return response.data;
  },

  bulkUpdate: async (data) => {
    const response = await api.patch("/vendors/bulk-update", data);
    return response.data;
  },
};
