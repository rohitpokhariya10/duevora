import HomePage from "../../features/landing/pages/HomePage";
import LoginPage from "../../features/auth/pages/LoginPage";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../../features/auth/pages/VerifyEmailPage";
import DashboardPage from "../../features/dashboard/pages/DashboardPage";

import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

export const routes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        path: "/verify-email",
        element: <VerifyEmailPage />,
      },
    ],
  },

  {
    element: <DashboardLayout />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
    ],
  },
];