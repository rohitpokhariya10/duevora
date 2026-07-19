import api from "../../../lib/api";

export const purchasesApi = {
  // Purchase Orders
  listPurchaseOrders: async (params) => {
    const response = await api.get("/purchase-orders", { params });
    return response.data;
  },

  getPurchaseOrder: async (id) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (data) => {
    const response = await api.post("/purchase-orders", data);
    return response.data;
  },

  // Purchases (Vendor Bills)
  list: async (params) => {
    const response = await api.get("/purchases", { params });
    return response.data;
  },

  getPurchase: async (id) => {
    const response = await api.get(`/purchases/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/purchases", data);
    return response.data;
  },

  approve: async (id) => {
    const response = await api.post(`/purchases/${id}/approve`);
    return response.data;
  },
};

export const paymentsApi = {
  list: async (params) => {
    const response = await api.get("/payments", { params });
    return response.data;
  },

  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/payments", data);
    return response.data;
  },
};

export const receiptsApi = {
  list: async (params) => {
    const response = await api.get("/receipts", { params });
    return response.data;
  },

  getReceipt: async (id) => {
    const response = await api.get(`/receipts/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/receipts", data);
    return response.data;
  },
};
