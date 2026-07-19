import api from "../../../lib/api";

export const accountingApi = {
  // Accounts (Chart of Accounts)
  createAccount: async (data) => {
    const response = await api.post("/accounts", data);
    return response.data;
  },

  listAccounts: async (params) => {
    const response = await api.get("/accounts", { params });
    return response.data;
  },

  getAccount: async (id) => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  // Journal Entries
  createJournalEntry: async (data) => {
    const response = await api.post("/journal-entries", data);
    return response.data;
  },

  listJournalEntries: async (params) => {
    const response = await api.get("/journal-entries", { params });
    return response.data;
  },

  getJournalEntry: async (id) => {
    const response = await api.get(`/journal-entries/${id}`);
    return response.data;
  },

  // Ledger
  listLedger: async (params) => {
    const response = await api.get("/ledger", { params });
    return response.data;
  },

  // Voucher Types
  createVoucherType: async (data) => {
    const response = await api.post("/voucher-types", data);
    return response.data;
  },

  listVoucherTypes: async (params) => {
    const response = await api.get("/voucher-types", { params });
    return response.data;
  },

  getVoucherType: async (id) => {
    const response = await api.get(`/voucher-types/${id}`);
    return response.data;
  },

  updateVoucherType: async (id, data) => {
    const response = await api.put(`/voucher-types/${id}`, data);
    return response.data;
  },

  deleteVoucherType: async (id) => {
    const response = await api.delete(`/voucher-types/${id}`);
    return response.data;
  },

  // Taxes
  createTax: async (data) => {
    const response = await api.post("/taxes", data);
    return response.data;
  },

  listTaxes: async (params) => {
    const response = await api.get("/taxes", { params });
    return response.data;
  },

  // Budgets
  createBudget: async (data) => {
    const response = await api.post("/budgets", data);
    return response.data;
  },

  listBudgets: async (params) => {
    const response = await api.get("/budgets", { params });
    return response.data;
  },

  getBudget: async (id) => {
    const response = await api.get(`/budgets/${id}`);
    return response.data;
  },

  updateBudget: async (id, data) => {
    const response = await api.put(`/budgets/${id}`, data);
    return response.data;
  },

  deleteBudget: async (id) => {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  },

  // Cost Centers
  createCostCenter: async (data) => {
    const response = await api.post("/cost-centers", data);
    return response.data;
  },

  listCostCenters: async (params) => {
    const response = await api.get("/cost-centers", { params });
    return response.data;
  },

  getCostCenter: async (id) => {
    const response = await api.get(`/cost-centers/${id}`);
    return response.data;
  },

  updateCostCenter: async (id, data) => {
    const response = await api.put(`/cost-centers/${id}`, data);
    return response.data;
  },

  deleteCostCenter: async (id) => {
    const response = await api.delete(`/cost-centers/${id}`);
    return response.data;
  },

  // Incomes
  createIncome: async (data) => {
    const response = await api.post("/incomes", data);
    return response.data;
  },

  listIncomes: async (params) => {
    const response = await api.get("/incomes", { params });
    return response.data;
  },

  // Expenses
  createExpense: async (data) => {
    const response = await api.post("/expenses", data);
    return response.data;
  },

  listExpenses: async (params) => {
    const response = await api.get("/expenses", { params });
    return response.data;
  },

  // Opening Balances
  createOpeningBalance: async (data) => {
    const response = await api.post("/opening-balances", data);
    return response.data;
  },

  listOpeningBalances: async (params) => {
    const response = await api.get("/opening-balances", { params });
    return response.data;
  },

  getOpeningBalance: async (id) => {
    const response = await api.get(`/opening-balances/${id}`);
    return response.data;
  },

  deleteOpeningBalance: async (id) => {
    const response = await api.delete(`/opening-balances/${id}`);
    return response.data;
  },

  // Financial Years
  listFinancialYears: async (params) => {
    const response = await api.get("/financial-years", { params });
    return response.data;
  },

  // Projects
  listProjects: async (params) => {
    const response = await api.get("/projects", { params });
    return response.data;
  },

  getProject: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  updateProject: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  createProject: async (data) => {
    const response = await api.post("/projects", data);
    return response.data;
  },
};
