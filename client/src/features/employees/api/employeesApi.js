import api from "../../../lib/api";

export const employeesApi = {
  list: async (params) => {
    const response = await api.get("/employees", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/employees", data);
    return response.data;
  },

  invite: async (data) => {
    const response = await api.post("/employees/invite", data);
    return response.data;
  },

  bulkImport: async (data) => {
    const response = await api.post("/employees/bulk-import", data);
    return response.data;
  },
};

export const usersApi = {
  list: async (params) => {
    const response = await api.get("/users", { params });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export const departmentsApi = {
  list: async (params) => {
    const response = await api.get("/departments", { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/departments", data);
    return response.data;
  },
};

export const rolesApi = {
  list: async (params) => {
    const response = await api.get("/roles", { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/roles", data);
    return response.data;
  },

  listPermissions: async () => {
    const response = await api.get("/roles/permissions");
    return response.data;
  },

  setPermissions: async (roleId, data) => {
    const response = await api.post(`/roles/${roleId}/permissions`, data);
    return response.data;
  },
};
