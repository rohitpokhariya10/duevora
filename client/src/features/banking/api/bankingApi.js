import api from "../../../lib/api";

export const bankingApi = {
  // Bank Accounts
  createBankAccount: async (data) => {
    const response = await api.post("/bank-accounts", data);
    return response.data;
  },

  listBankAccounts: async (params) => {
    const response = await api.get("/bank-accounts", { params });
    return response.data;
  },

  // Bank Transactions
  createBankTransaction: async (data) => {
    const response = await api.post("/bank-transactions", data);
    return response.data;
  },

  listBankTransactions: async (params) => {
    const response = await api.get("/bank-transactions", { params });
    return response.data;
  },
};
