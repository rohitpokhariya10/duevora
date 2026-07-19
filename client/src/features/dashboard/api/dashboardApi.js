import api from "../../../lib/api";

export const projectsApi = {
  list: async (params) => {
    const response = await api.get("/projects", { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/projects", data);
    return response.data;
  },
};

export const remindersApi = {
  list: async (params) => {
    const response = await api.get("/reminders", { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/reminders", data);
    return response.data;
  },
};
