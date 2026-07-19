import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../features/auth/state/authSlice";
import onboardingReducer from "../../features/onboarding/state/onboardingSlice";
import customersReducer from "../../features/customers/state/customersSlice";
import vendorsReducer from "../../features/vendors/state/vendorsSlice";
import productsReducer from "../../features/products/state/productsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    customers: customersReducer,
    vendors: vendorsReducer,
    products: productsReducer,
  },
});
