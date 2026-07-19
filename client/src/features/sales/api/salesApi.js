import api from "../../../lib/api";

export const salesApi = {
  // Quotations
  listQuotations: async (params) => {
    const response = await api.get("/quotations", { params });
    return response.data;
  },

  getQuotation: async (id) => {
    const response = await api.get(`/quotations/${id}`);
    return response.data;
  },

  createQuotation: async (data) => {
    const response = await api.post("/quotations", data);
    return response.data;
  },

  approveQuotation: async (id) => {
    const response = await api.post(`/quotations/${id}/approve`);
    return response.data;
  },

  // Sales Orders
  listSalesOrders: async (params) => {
    const response = await api.get("/sales-orders", { params });
    return response.data;
  },

  getSalesOrder: async (id) => {
    const response = await api.get(`/sales-orders/${id}`);
    return response.data;
  },

  createSalesOrder: async (data) => {
    const response = await api.post("/sales-orders", data);
    return response.data;
  },

  approveSalesOrder: async (id) => {
    const response = await api.post(`/sales-orders/${id}/approve`);
    return response.data;
  },

  // Delivery Challans
  listDeliveryChallans: async (params) => {
    const response = await api.get("/delivery-challans", { params });
    return response.data;
  },

  getDeliveryChallan: async (id) => {
    const response = await api.get(`/delivery-challans/${id}`);
    return response.data;
  },

  createDeliveryChallan: async (data) => {
    const response = await api.post("/delivery-challans", data);
    return response.data;
  },

  // Invoices
  listInvoices: async (params) => {
    const response = await api.get("/invoices", { params });
    return response.data;
  },

  getInvoice: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (data) => {
    const response = await api.post("/invoices", data);
    return response.data;
  },

  approveInvoice: async (id) => {
    const response = await api.post(`/invoices/${id}/approve`);
    return response.data;
  },

  // Payment Automation
  sendPaymentReminder: async (invoiceId) => {
    const response = await api.post("/webhooks/send-reminder", { invoiceId });
    return response.data;
  },

  simulatePayment: async (invoiceId) => {
    const response = await api.post("/webhooks/simulate-payment", { invoiceId });
    return response.data;
  },

  triggerDueCheck: async () => {
    const response = await api.post("/webhooks/trigger-due-check");
    return response.data;
  },
};
