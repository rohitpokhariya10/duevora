import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import useNotification from "../../../app/components/notification/useNotification";
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  clearError,
  clearSelectedItem,
  setPage,
  setPageSize,
} from "../state/customersSlice";

export default function useCustomers() {
  const dispatch = useAppDispatch();
  const { success, error: notifyError } = useNotification();
  const state = useAppSelector((s) => s.customers);

  const getAll = useCallback(
    async (params) => {
      const result = await dispatch(fetchCustomers(params));
      if (result.meta.requestStatus === "rejected") {
        notifyError(result.payload);
      }
      return result;
    },
    [dispatch, notifyError]
  );

  const getById = useCallback(
    async (id) => {
      const result = await dispatch(fetchCustomerById(id));
      if (result.meta.requestStatus === "rejected") {
        notifyError(result.payload);
      }
      return result;
    },
    [dispatch, notifyError]
  );

  const create = useCallback(
    async (data) => {
      const result = await dispatch(createCustomer(data));
      if (result.meta.requestStatus === "fulfilled") {
        success("Customer created successfully");
      } else {
        notifyError(result.payload);
      }
      return result;
    },
    [dispatch, success, notifyError]
  );

  const update = useCallback(
    async (id, data) => {
      const result = await dispatch(updateCustomer({ id, data }));
      if (result.meta.requestStatus === "fulfilled") {
        success("Customer updated successfully");
      } else {
        notifyError(result.payload);
      }
      return result;
    },
    [dispatch, success, notifyError]
  );

  const remove = useCallback(
    async (id) => {
      const result = await dispatch(deleteCustomer(id));
      if (result.meta.requestStatus === "fulfilled") {
        success("Customer deleted successfully");
      } else {
        notifyError(result.payload);
      }
      return result;
    },
    [dispatch, success, notifyError]
  );

  const bulkDelete = useCallback(
    async (ids) => {
      const result = await dispatch(bulkDeleteCustomers(ids));
      if (result.meta.requestStatus === "fulfilled") {
        success(`${ids.length} customer(s) deleted`);
      } else {
        notifyError(result.payload);
      }
      return result;
    },
    [dispatch, success, notifyError]
  );

  return {
    ...state,
    getAll,
    getById,
    create,
    update,
    remove,
    bulkDelete,
    clearError: () => dispatch(clearError()),
    clearSelectedItem: () => dispatch(clearSelectedItem()),
    setPage: (p) => dispatch(setPage(p)),
    setPageSize: (s) => dispatch(setPageSize(s)),
  };
}
