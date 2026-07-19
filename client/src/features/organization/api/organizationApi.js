import api from "../../../lib/api";

export const organizationApi = {
  create: async (data) => {
    const response = await api.post("/organization", data);
    return response.data;
  },

  get: async () => {
    const response = await api.get("/organization");
    return response.data;
  },

  update: async (data) => {
    const response = await api.put("/organization", data);
    return response.data;
  },
};
