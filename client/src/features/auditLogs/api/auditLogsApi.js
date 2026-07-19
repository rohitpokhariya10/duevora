import api from "../../../lib/api";

export const auditLogsApi = {
  list: async (params) => {
    const response = await api.get("/audit-logs", { params });
    return response.data;
  },
};
