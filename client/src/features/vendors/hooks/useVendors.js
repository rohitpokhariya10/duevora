import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import useNotification from "../../../app/components/notification/useNotification";
import {
  fetchVendors,
  fetchVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  clearError,
  clearSelectedItem,
  setPage,
  setPageSize,
} from "../state/vendorsSlice";

export default function useVendors() {
  const dispatch = useAppDispatch();
  const { success, error: notifyError } = useNotification();
  const state = useAppSelector((s) => s.vendors);

  const getAll = useCallback(
    async (params) => {
      const result = await dispatch(fetchVendors(params));
      if (result.meta.requestStatus === "rejected") notifyError(result.payload);
      return result;
    },
    [dispatch, notifyError]
  );

  const getById = useCallback(
    async (id) => {
      const result = await dispatch(fetchVendorById(id));
      if (result.meta.requestStatus === "rejected") notifyError(result.payload);
      return result;
    },
    [dispatch, notifyError]
  );

  const create = useCallback(
    async (data) => {
      const result = await dispatch(createVendor(data));
      if (result.meta.requestStatus === "fulfilled") success("Vendor created successfully");
      else notifyError(result.payload);
      return result;
    },
    [dispatch, success, notifyError]
  );

  const update = useCallback(
    async (id, data) => {
      const result = await dispatch(updateVendor({ id, data }));
      if (result.meta.requestStatus === "fulfilled") success("Vendor updated successfully");
      else notifyError(result.payload);
      return result;
    },
    [dispatch, success, notifyError]
  );

  const remove = useCallback(
    async (id) => {
      const result = await dispatch(deleteVendor(id));
      if (result.meta.requestStatus === "fulfilled") success("Vendor deleted successfully");
      else notifyError(result.payload);
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
    clearError: () => dispatch(clearError()),
    clearSelectedItem: () => dispatch(clearSelectedItem()),
    setPage: (p) => dispatch(setPage(p)),
    setPageSize: (s) => dispatch(setPageSize(s)),
  };
}
