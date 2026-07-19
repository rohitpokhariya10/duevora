import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import useNotification from "../../../app/components/notification/useNotification";
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  clearError,
  clearSelectedItem,
  setPage,
  setPageSize,
} from "../state/productsSlice";

export default function useProducts() {
  const dispatch = useAppDispatch();
  const { success, error: notifyError } = useNotification();
  const state = useAppSelector((s) => s.products);

  const getAll = useCallback(
    async (params) => {
      const result = await dispatch(fetchProducts(params));
      if (result.meta.requestStatus === "rejected") notifyError(result.payload);
      return result;
    },
    [dispatch, notifyError]
  );

  const getById = useCallback(
    async (id) => {
      const result = await dispatch(fetchProductById(id));
      if (result.meta.requestStatus === "rejected") notifyError(result.payload);
      return result;
    },
    [dispatch, notifyError]
  );

  const create = useCallback(
    async (data) => {
      const result = await dispatch(createProduct(data));
      if (result.meta.requestStatus === "fulfilled") success("Product created successfully");
      else notifyError(result.payload);
      return result;
    },
    [dispatch, success, notifyError]
  );

  const update = useCallback(
    async (id, data) => {
      const result = await dispatch(updateProduct({ id, data }));
      if (result.meta.requestStatus === "fulfilled") success("Product updated successfully");
      else notifyError(result.payload);
      return result;
    },
    [dispatch, success, notifyError]
  );

  const remove = useCallback(
    async (id) => {
      const result = await dispatch(deleteProduct(id));
      if (result.meta.requestStatus === "fulfilled") success("Product deleted successfully");
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
