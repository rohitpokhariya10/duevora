import api from "../../../lib/api";

export const notificationsApi = {
  list: async (params) => {
    const response = await api.get("/notifications", { params });
    return response.data;
  },

  markRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.put("/notifications/read-all");
    return response.data;
  },
};
