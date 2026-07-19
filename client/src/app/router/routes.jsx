import LoginPage from "../../features/auth/pages/LoginPage";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../../features/auth/pages/VerifyEmailPage";
import ForgotPasswordPage from "../../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../../features/auth/pages/ResetPasswordPage";
import OnboardingPage from "../../features/onboarding/ui/pages/OnboardingPage";
import DashboardPage from "../../features/dashboard/pages/DashboardPage";

// Customers
import { CustomerListPage, CustomerCreatePage, CustomerDetailPage, CustomerEditPage } from "../../features/customers/pages";
// Vendors
import { VendorListPage, VendorCreatePage, VendorDetailPage, VendorEditPage } from "../../features/vendors/pages";
// Products
import { ProductListPage, ProductCreatePage, ProductDetailPage, ProductEditPage } from "../../features/products/pages";
// Sales
import QuotationListPage from "../../features/sales/ui/pages/QuotationListPage";
import SalesOrderListPage from "../../features/sales/ui/pages/SalesOrderListPage";
import InvoiceListPage from "../../features/sales/ui/pages/InvoiceListPage";
import DeliveryChallanListPage from "../../features/sales/ui/pages/DeliveryChallanListPage";
// Purchases
import PurchaseOrderListPage from "../../features/purchases/ui/pages/PurchaseOrderListPage";
import PurchaseListPage from "../../features/purchases/ui/pages/PurchaseListPage";
// Accounting
import AccountListPage from "../../features/accounting/ui/pages/AccountListPage";
import AccountTreePage from "../../features/accounting/ui/pages/AccountTreePage";
import JournalEntryListPage from "../../features/accounting/ui/pages/JournalEntryListPage";
import JournalEntryDetailPage from "../../features/accounting/ui/pages/JournalEntryDetailPage";
import LedgerViewPage from "../../features/accounting/ui/pages/LedgerViewPage";
import VoucherTypeListPage from "../../features/accounting/ui/pages/VoucherTypeListPage";
import OpeningBalanceListPage from "../../features/accounting/ui/pages/OpeningBalanceListPage";
import BudgetListPage from "../../features/accounting/ui/pages/BudgetListPage";
import CostCenterListPage from "../../features/accounting/ui/pages/CostCenterListPage";
import ProjectListPage from "../../features/accounting/ui/pages/ProjectListPage";
// Banking
import BankAccountListPage from "../../features/banking/ui/pages/BankAccountListPage";
import CashEntryPage from "../../features/treasury/ui/pages/CashEntryPage";
// Inventory
import InventoryListPage from "../../features/inventory/ui/pages/InventoryListPage";
import StockMovementListPage from "../../features/inventory/ui/pages/StockMovementListPage";
import StockAdjustmentListPage from "../../features/inventory/ui/pages/StockAdjustmentListPage";
import StockTransferListPage from "../../features/inventory/ui/pages/StockTransferListPage";
// Employees
import EmployeeListPage from "../../features/employees/ui/pages/EmployeeListPage";
import UserListPage from "../../features/employees/ui/pages/UserListPage";
// Settings
import SettingsPage from "../../features/settings/ui/pages/SettingsPage";
import FinancialYearListPage from "../../features/settings/ui/pages/FinancialYearListPage";
import CurrencyListPage from "../../features/settings/ui/pages/CurrencyListPage";
import ExchangeRateListPage from "../../features/settings/ui/pages/ExchangeRateListPage";
// Reports
import ReportsPage from "../../features/reports/ui/pages/ReportsPage";
// Audit Logs
import AuditLogListPage from "../../features/auditLogs/ui/pages/AuditLogListPage";
import AuditLogDetailPage from "../components/common/pages/AuditLogDetailPage";
// Common pages
import NotFoundPage from "../components/common/pages/NotFoundPage";
import NotificationsPage from "../components/common/pages/NotificationsPage";
import ProfilePage from "../components/common/pages/ProfilePage";
import AccessDeniedPage from "../components/common/pages/AccessDenied";
// Organization
import OrganizationPage from "../../features/organization/ui/pages/OrganizationPage";
// Employees extra
import EmployeeAttendancePage from "../../features/employees/ui/pages/EmployeeAttendancePage";
// Banking extra
import BankReconciliationPage from "../../features/banking/ui/pages/BankReconciliationPage";
// Treasury
import ExpenseListPage from "../../features/treasury/ui/pages/ExpenseListPage";
import IncomeListPage from "../../features/treasury/ui/pages/IncomeListPage";
// Purchases extra
import PaymentListPage from "../../features/purchases/ui/pages/PaymentListPage";
import ReceiptListPage from "../../features/purchases/ui/pages/ReceiptListPage";

import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import PublicRoute from "../components/routes/PublicRoute";
import ProtectedRoute from "../components/routes/ProtectedRoute";
import LandingPage from "../../features/landing/pages/LandingPage";
import OnboardingRoute from "../components/routes/OnboardingRoute";

export const routes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage/>,
      },
    ],
  },

  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/reset-password/:token", element: <ResetPasswordPage /> },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/verify-email", element: <VerifyEmailPage /> },
        ],
      },
    ],
  },

  {
    element: <OnboardingRoute />,
    children: [
      { path: "/onboard", element: <OnboardingPage /> },
    ],
  },

  {
    element: <ProtectedRoute requireVerified requireOnboarding />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },

          // Customers (full CRUD)
          { path: "/dashboard/customers", element: <CustomerListPage /> },
          { path: "/dashboard/customers/create", element: <CustomerCreatePage /> },
          { path: "/dashboard/customers/:id", element: <CustomerDetailPage /> },
          { path: "/dashboard/customers/:id/edit", element: <CustomerEditPage /> },

          // Vendors (full CRUD)
          { path: "/dashboard/vendors", element: <VendorListPage /> },
          { path: "/dashboard/vendors/create", element: <VendorCreatePage /> },
          { path: "/dashboard/vendors/:id", element: <VendorDetailPage /> },
          { path: "/dashboard/vendors/:id/edit", element: <VendorEditPage /> },

          // Products (full CRUD)
          { path: "/dashboard/products", element: <ProductListPage /> },
          { path: "/dashboard/products/create", element: <ProductCreatePage /> },
          { path: "/dashboard/products/:id", element: <ProductDetailPage /> },
          { path: "/dashboard/products/:id/edit", element: <ProductEditPage /> },

          // Sales
          { path: "/dashboard/quotations", element: <QuotationListPage /> },
          { path: "/dashboard/sales-orders", element: <SalesOrderListPage /> },
          { path: "/dashboard/invoices", element: <InvoiceListPage /> },
          { path: "/dashboard/delivery-challans", element: <DeliveryChallanListPage /> },

          // Purchases
          { path: "/dashboard/purchase-orders", element: <PurchaseOrderListPage /> },
          { path: "/dashboard/purchases", element: <PurchaseListPage /> },

          // Accounting
          { path: "/dashboard/accounts", element: <AccountListPage /> },
          { path: "/dashboard/accounts/tree", element: <AccountTreePage /> },
          { path: "/dashboard/journal-entries", element: <JournalEntryListPage /> },
          { path: "/dashboard/journal-entries/:id", element: <JournalEntryDetailPage /> },
          { path: "/dashboard/ledger", element: <LedgerViewPage /> },
          { path: "/dashboard/voucher-types", element: <VoucherTypeListPage /> },
          { path: "/dashboard/opening-balances", element: <OpeningBalanceListPage /> },
          { path: "/dashboard/budgets", element: <BudgetListPage /> },
          { path: "/dashboard/cost-centers", element: <CostCenterListPage /> },
          { path: "/dashboard/projects", element: <ProjectListPage /> },

          // Banking
          { path: "/dashboard/bank-accounts", element: <BankAccountListPage /> },
          { path: "/dashboard/cash-entries", element: <CashEntryPage /> },

          // Inventory
          { path: "/dashboard/inventory", element: <InventoryListPage /> },
          { path: "/dashboard/stock-movements", element: <StockMovementListPage /> },
          { path: "/dashboard/stock-adjustments", element: <StockAdjustmentListPage /> },
          { path: "/dashboard/stock-transfers", element: <StockTransferListPage /> },

          // Employees
          { path: "/dashboard/employees", element: <EmployeeListPage /> },
          { path: "/dashboard/employees/attendance", element: <EmployeeAttendancePage /> },
          { path: "/dashboard/users", element: <UserListPage /> },

          // Organization
          { path: "/dashboard/organization", element: <OrganizationPage /> },

          // Settings
          { path: "/dashboard/settings", element: <SettingsPage /> },
          { path: "/dashboard/financial-years", element: <FinancialYearListPage /> },
          { path: "/dashboard/currencies", element: <CurrencyListPage /> },
          { path: "/dashboard/exchange-rates", element: <ExchangeRateListPage /> },

          // Reports
          { path: "/dashboard/reports", element: <ReportsPage /> },

          // Audit Logs
          { path: "/dashboard/audit-logs", element: <AuditLogListPage /> },
          { path: "/dashboard/audit-logs/:id", element: <AuditLogDetailPage /> },

          // Banking extra
          { path: "/dashboard/bank-reconciliation", element: <BankReconciliationPage /> },

          // Treasury
          { path: "/dashboard/expense-list", element: <ExpenseListPage /> },
          { path: "/dashboard/income-list", element: <IncomeListPage /> },

          // Purchases extra
          { path: "/dashboard/payments", element: <PaymentListPage /> },
          { path: "/dashboard/receipts", element: <ReceiptListPage /> },

          // Notifications
          { path: "/dashboard/notifications", element: <NotificationsPage /> },

          // Profile
          { path: "/dashboard/profile", element: <ProfilePage /> },

          // Access Denied
          { path: "/dashboard/access-denied", element: <AccessDeniedPage /> },
        ],
      },
    ],
  },

  // 404
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
