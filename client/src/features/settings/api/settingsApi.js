import api from "../../../lib/api";

export const settingsApi = {
  get: async () => {
    const response = await api.get("/settings");
    return response.data;
  },

  update: async (data) => {
    const response = await api.put("/settings", data);
    return response.data;
  },

  // Financial Years
  createFinancialYear: async (data) => {
    const response = await api.post("/financial-years", data);
    return response.data;
  },

  listFinancialYears: async (params) => {
    const response = await api.get("/financial-years", { params });
    return response.data;
  },

  getFinancialYear: async (id) => {
    const response = await api.get(`/financial-years/${id}`);
    return response.data;
  },

  updateFinancialYear: async (id, data) => {
    const response = await api.put(`/financial-years/${id}`, data);
    return response.data;
  },

  deleteFinancialYear: async (id) => {
    const response = await api.delete(`/financial-years/${id}`);
    return response.data;
  },

  archiveFinancialYear: async (id) => {
    const response = await api.post(`/financial-years/${id}/archive`);
    return response.data;
  },

  // Currencies
  createCurrency: async (data) => {
    const response = await api.post("/currencies", data);
    return response.data;
  },

  listCurrencies: async (params) => {
    const response = await api.get("/currencies", { params });
    return response.data;
  },

  getCurrency: async (id) => {
    const response = await api.get(`/currencies/${id}`);
    return response.data;
  },

  updateCurrency: async (id, data) => {
    const response = await api.put(`/currencies/${id}`, data);
    return response.data;
  },

  deleteCurrency: async (id) => {
    const response = await api.delete(`/currencies/${id}`);
    return response.data;
  },

  // Exchange Rates
  createExchangeRate: async (data) => {
    const response = await api.post("/exchange-rates", data);
    return response.data;
  },

  listExchangeRates: async (params) => {
    const response = await api.get("/exchange-rates", { params });
    return response.data;
  },

  getExchangeRate: async (id) => {
    const response = await api.get(`/exchange-rates/${id}`);
    return response.data;
  },

  updateExchangeRate: async (id, data) => {
    const response = await api.put(`/exchange-rates/${id}`, data);
    return response.data;
  },

  deleteExchangeRate: async (id) => {
    const response = await api.delete(`/exchange-rates/${id}`);
    return response.data;
  },
};
