import Permission from "../models/permission.model.js";

const permissions = [
  // Accounts
  { name: "Create Account", code: "ACCOUNTS.CREATE", module: "accounts", description: "Create new accounts in chart of accounts" },
  { name: "View Accounts", code: "ACCOUNTS.VIEW", module: "accounts", description: "View chart of accounts" },
  { name: "Update Account", code: "ACCOUNTS.UPDATE", module: "accounts", description: "Update account details" },
  { name: "Delete Account", code: "ACCOUNTS.DELETE", module: "accounts", description: "Delete an account" },

  // Audit Logs
  { name: "View Audit Logs", code: "AUDITLOGS.VIEW", module: "auditLogs", description: "View audit log entries" },

  // Bank Accounts
  { name: "Create Bank Account", code: "BANKACCOUNTS.CREATE", module: "bankAccounts", description: "Create a new bank account" },
  { name: "View Bank Accounts", code: "BANKACCOUNTS.VIEW", module: "bankAccounts", description: "View bank accounts" },
  { name: "Update Bank Account", code: "BANKACCOUNTS.UPDATE", module: "bankAccounts", description: "Update bank account details" },
  { name: "Delete Bank Account", code: "BANKACCOUNTS.DELETE", module: "bankAccounts", description: "Delete a bank account" },

  // Bank Transactions
  { name: "Create Bank Transaction", code: "BANKTRANSACTIONS.CREATE", module: "bankTransactions", description: "Record a bank transaction" },
  { name: "View Bank Transactions", code: "BANKTRANSACTIONS.VIEW", module: "bankTransactions", description: "View bank transactions" },

  // Budgets
  { name: "Create Budget", code: "BUDGETS.CREATE", module: "budgets", description: "Create a new budget" },
  { name: "View Budgets", code: "BUDGETS.VIEW", module: "budgets", description: "View budgets" },
  { name: "Update Budget", code: "BUDGETS.UPDATE", module: "budgets", description: "Update budget details" },
  { name: "Delete Budget", code: "BUDGETS.DELETE", module: "budgets", description: "Delete a budget" },

  // Categories
  { name: "Create Category", code: "CATEGORIES.CREATE", module: "categories", description: "Create a new product category" },
  { name: "View Categories", code: "CATEGORIES.VIEW", module: "categories", description: "View product categories" },
  { name: "Update Category", code: "CATEGORIES.UPDATE", module: "categories", description: "Update a category" },
  { name: "Delete Category", code: "CATEGORIES.DELETE", module: "categories", description: "Delete a category" },

  // Cost Centers
  { name: "Create Cost Center", code: "COSTCENTERS.CREATE", module: "costCenters", description: "Create a new cost center" },
  { name: "View Cost Centers", code: "COSTCENTERS.VIEW", module: "costCenters", description: "View cost centers" },

  // Currencies
  { name: "Create Currency", code: "CURRENCIES.CREATE", module: "currencies", description: "Create a new currency" },
  { name: "View Currencies", code: "CURRENCIES.VIEW", module: "currencies", description: "View currencies" },
  { name: "Update Currency", code: "CURRENCIES.UPDATE", module: "currencies", description: "Update currency details" },
  { name: "Delete Currency", code: "CURRENCIES.DELETE", module: "currencies", description: "Delete a currency" },

  // Customers
  { name: "Create Customer", code: "CUSTOMERS.CREATE", module: "customers", description: "Create a new customer" },
  { name: "View Customers", code: "CUSTOMERS.VIEW", module: "customers", description: "View customer list" },
  { name: "Update Customer", code: "CUSTOMERS.UPDATE", module: "customers", description: "Update customer details" },
  { name: "Delete Customer", code: "CUSTOMERS.DELETE", module: "customers", description: "Delete a customer" },

  // Delivery Challans
  { name: "Create Delivery Challan", code: "DELIVERYCHALLANS.CREATE", module: "deliveryChallans", description: "Create a delivery challan" },
  { name: "View Delivery Challans", code: "DELIVERYCHALLANS.VIEW", module: "deliveryChallans", description: "View delivery challans" },
  { name: "Update Delivery Challan", code: "DELIVERYCHALLANS.UPDATE", module: "deliveryChallans", description: "Update a delivery challan" },

  // Departments
  { name: "Create Department", code: "DEPARTMENTS.CREATE", module: "departments", description: "Create a new department" },
  { name: "View Departments", code: "DEPARTMENTS.VIEW", module: "departments", description: "View departments" },
  { name: "Update Department", code: "DEPARTMENTS.UPDATE", module: "departments", description: "Update a department" },
  { name: "Delete Department", code: "DEPARTMENTS.DELETE", module: "departments", description: "Delete a department" },

  // Employees
  { name: "Create Employee", code: "EMPLOYEES.CREATE", module: "employees", description: "Create or invite an employee" },
  { name: "View Employees", code: "EMPLOYEES.VIEW", module: "employees", description: "View employee list" },
  { name: "Update Employee", code: "EMPLOYEES.UPDATE", module: "employees", description: "Update employee details" },
  { name: "Delete Employee", code: "EMPLOYEES.DELETE", module: "employees", description: "Delete an employee" },

  // Exchange Rates
  { name: "Create Exchange Rate", code: "EXCHANGERATES.CREATE", module: "exchangeRates", description: "Create a new exchange rate" },
  { name: "View Exchange Rates", code: "EXCHANGERATES.VIEW", module: "exchangeRates", description: "View exchange rates" },
  { name: "Update Exchange Rate", code: "EXCHANGERATES.UPDATE", module: "exchangeRates", description: "Update an exchange rate" },
  { name: "Delete Exchange Rate", code: "EXCHANGERATES.DELETE", module: "exchangeRates", description: "Delete an exchange rate" },

  // Expenses
  { name: "Create Expense", code: "EXPENSES.CREATE", module: "expenses", description: "Record a new expense" },
  { name: "View Expenses", code: "EXPENSES.VIEW", module: "expenses", description: "View expenses" },
  { name: "Update Expense", code: "EXPENSES.UPDATE", module: "expenses", description: "Update an expense" },
  { name: "Delete Expense", code: "EXPENSES.DELETE", module: "expenses", description: "Delete an expense" },

  // Financial Years
  { name: "Create Financial Year", code: "FINANCIALYEARS.CREATE", module: "financialYears", description: "Create a financial year" },
  { name: "View Financial Years", code: "FINANCIALYEARS.VIEW", module: "financialYears", description: "View financial years" },
  { name: "Update Financial Year", code: "FINANCIALYEARS.UPDATE", module: "financialYears", description: "Update a financial year" },
  { name: "Delete Financial Year", code: "FINANCIALYEARS.DELETE", module: "financialYears", description: "Delete a financial year" },
  { name: "Archive Financial Year", code: "FINANCIALYEARS.ARCHIVE", module: "financialYears", description: "Archive a financial year" },

  // Incomes
  { name: "Create Income", code: "INCOMES.CREATE", module: "incomes", description: "Record a new income" },
  { name: "View Incomes", code: "INCOMES.VIEW", module: "incomes", description: "View incomes" },
  { name: "Update Income", code: "INCOMES.UPDATE", module: "incomes", description: "Update an income record" },
  { name: "Delete Income", code: "INCOMES.DELETE", module: "incomes", description: "Delete an income record" },

  // Inventory
  { name: "View Inventory", code: "INVENTORY.VIEW", module: "inventory", description: "View inventory levels" },
  { name: "Update Inventory", code: "INVENTORY.UPDATE", module: "inventory", description: "Update inventory levels" },

  // Invoices
  { name: "Create Invoice", code: "INVOICES.CREATE", module: "invoices", description: "Create a new invoice" },
  { name: "View Invoices", code: "INVOICES.VIEW", module: "invoices", description: "View invoices" },
  { name: "Update Invoice", code: "INVOICES.UPDATE", module: "invoices", description: "Update an invoice" },
  { name: "Delete Invoice", code: "INVOICES.DELETE", module: "invoices", description: "Delete an invoice" },

  // Journal Entries
  { name: "Create Journal Entry", code: "JOURNALENTRIES.CREATE", module: "journalEntries", description: "Create a journal entry" },
  { name: "View Journal Entries", code: "JOURNALENTRIES.VIEW", module: "journalEntries", description: "View journal entries" },
  { name: "Update Journal Entry", code: "JOURNALENTRIES.UPDATE", module: "journalEntries", description: "Update a journal entry" },
  { name: "Delete Journal Entry", code: "JOURNALENTRIES.DELETE", module: "journalEntries", description: "Delete a journal entry" },

  // Ledger
  { name: "View Ledger", code: "LEDGER.VIEW", module: "ledger", description: "View general ledger" },

  // Notifications
  { name: "View Notifications", code: "NOTIFICATIONS.VIEW", module: "notifications", description: "View notifications" },
  { name: "Delete Notifications", code: "NOTIFICATIONS.DELETE", module: "notifications", description: "Delete notifications" },

  // Opening Balances
  { name: "Create Opening Balance", code: "OPENINGBALANCES.CREATE", module: "openingBalances", description: "Create an opening balance" },
  { name: "View Opening Balances", code: "OPENINGBALANCES.VIEW", module: "openingBalances", description: "View opening balances" },

  // Organization
  { name: "View Organization", code: "ORGANIZATION.VIEW", module: "organization", description: "View organization details" },
  { name: "Update Organization", code: "ORGANIZATION.UPDATE", module: "organization", description: "Update organization details" },

  // Payments
  { name: "Create Payment", code: "PAYMENTS.CREATE", module: "payments", description: "Record a payment" },
  { name: "View Payments", code: "PAYMENTS.VIEW", module: "payments", description: "View payments" },
  { name: "Update Payment", code: "PAYMENTS.UPDATE", module: "payments", description: "Update a payment" },
  { name: "Delete Payment", code: "PAYMENTS.DELETE", module: "payments", description: "Delete a payment" },

  // Products
  { name: "Create Product", code: "PRODUCTS.CREATE", module: "products", description: "Create a new product" },
  { name: "View Products", code: "PRODUCTS.VIEW", module: "products", description: "View product catalog" },
  { name: "Update Product", code: "PRODUCTS.UPDATE", module: "products", description: "Update product details" },
  { name: "Delete Product", code: "PRODUCTS.DELETE", module: "products", description: "Delete a product" },

  // Projects
  { name: "Create Project", code: "PROJECTS.CREATE", module: "projects", description: "Create a new project" },
  { name: "View Projects", code: "PROJECTS.VIEW", module: "projects", description: "View projects" },
  { name: "Update Project", code: "PROJECTS.UPDATE", module: "projects", description: "Update a project" },
  { name: "Delete Project", code: "PROJECTS.DELETE", module: "projects", description: "Delete a project" },

  // Purchase Orders
  { name: "Create Purchase Order", code: "PURCHASEORDERS.CREATE", module: "purchaseOrders", description: "Create a purchase order" },
  { name: "View Purchase Orders", code: "PURCHASEORDERS.VIEW", module: "purchaseOrders", description: "View purchase orders" },
  { name: "Update Purchase Order", code: "PURCHASEORDERS.UPDATE", module: "purchaseOrders", description: "Update a purchase order" },
  { name: "Delete Purchase Order", code: "PURCHASEORDERS.DELETE", module: "purchaseOrders", description: "Delete a purchase order" },

  // Purchases
  { name: "Create Purchase", code: "PURCHASES.CREATE", module: "purchases", description: "Record a purchase" },
  { name: "View Purchases", code: "PURCHASES.VIEW", module: "purchases", description: "View purchases" },
  { name: "Update Purchase", code: "PURCHASES.UPDATE", module: "purchases", description: "Update a purchase" },
  { name: "Delete Purchase", code: "PURCHASES.DELETE", module: "purchases", description: "Delete a purchase" },

  // Quotations
  { name: "Create Quotation", code: "QUOTATIONS.CREATE", module: "quotations", description: "Create a quotation" },
  { name: "View Quotations", code: "QUOTATIONS.VIEW", module: "quotations", description: "View quotations" },
  { name: "Update Quotation", code: "QUOTATIONS.UPDATE", module: "quotations", description: "Update a quotation" },
  { name: "Delete Quotation", code: "QUOTATIONS.DELETE", module: "quotations", description: "Delete a quotation" },

  // Receipts
  { name: "Create Receipt", code: "RECEIPTS.CREATE", module: "receipts", description: "Record a receipt" },
  { name: "View Receipts", code: "RECEIPTS.VIEW", module: "receipts", description: "View receipts" },
  { name: "Update Receipt", code: "RECEIPTS.UPDATE", module: "receipts", description: "Update a receipt" },
  { name: "Delete Receipt", code: "RECEIPTS.DELETE", module: "receipts", description: "Delete a receipt" },

  // Reminders
  { name: "Create Reminder", code: "REMINDERS.CREATE", module: "reminders", description: "Create a reminder" },
  { name: "View Reminders", code: "REMINDERS.VIEW", module: "reminders", description: "View reminders" },

  // Reports
  { name: "View Reports", code: "REPORTS.VIEW", module: "reports", description: "View financial reports" },

  // Roles
  { name: "Create Role", code: "ROLES.CREATE", module: "roles", description: "Create a new role" },
  { name: "View Roles", code: "ROLES.VIEW", module: "roles", description: "View roles" },
  { name: "Update Role", code: "ROLES.UPDATE", module: "roles", description: "Update a role" },
  { name: "Delete Role", code: "ROLES.DELETE", module: "roles", description: "Delete a role" },

  // Sales Orders
  { name: "Create Sales Order", code: "SALESORDERS.CREATE", module: "salesOrders", description: "Create a sales order" },
  { name: "View Sales Orders", code: "SALESORDERS.VIEW", module: "salesOrders", description: "View sales orders" },
  { name: "Update Sales Order", code: "SALESORDERS.UPDATE", module: "salesOrders", description: "Update a sales order" },
  { name: "Delete Sales Order", code: "SALESORDERS.DELETE", module: "salesOrders", description: "Delete a sales order" },

  // Settings
  { name: "View Settings", code: "SETTINGS.VIEW", module: "settings", description: "View settings" },
  { name: "Update Settings", code: "SETTINGS.UPDATE", module: "settings", description: "Update settings" },

  // Stock Adjustments
  { name: "Create Stock Adjustment", code: "STOCKADJUSTMENTS.CREATE", module: "stockAdjustments", description: "Create a stock adjustment" },
  { name: "View Stock Adjustments", code: "STOCKADJUSTMENTS.VIEW", module: "stockAdjustments", description: "View stock adjustments" },
  { name: "Update Stock Adjustment", code: "STOCKADJUSTMENTS.UPDATE", module: "stockAdjustments", description: "Approve a stock adjustment" },

  // Stock Movements
  { name: "View Stock Movements", code: "STOCKMOVEMENTS.VIEW", module: "stockMovements", description: "View stock movements" },

  // Stock Transfers
  { name: "Create Stock Transfer", code: "STOCKTRANSFERS.CREATE", module: "stockTransfers", description: "Create a stock transfer" },
  { name: "View Stock Transfers", code: "STOCKTRANSFERS.VIEW", module: "stockTransfers", description: "View stock transfers" },
  { name: "Update Stock Transfer", code: "STOCKTRANSFERS.UPDATE", module: "stockTransfers", description: "Approve a stock transfer" },

  // Taxes
  { name: "Create Tax", code: "TAXES.CREATE", module: "taxes", description: "Create a tax rate" },
  { name: "View Taxes", code: "TAXES.VIEW", module: "taxes", description: "View tax rates" },
  { name: "Update Tax", code: "TAXES.UPDATE", module: "taxes", description: "Update a tax rate" },
  { name: "Delete Tax", code: "TAXES.DELETE", module: "taxes", description: "Delete a tax rate" },

  // Units
  { name: "Create Unit", code: "UNITS.CREATE", module: "units", description: "Create a unit of measure" },
  { name: "View Units", code: "UNITS.VIEW", module: "units", description: "View units" },
  { name: "Update Unit", code: "UNITS.UPDATE", module: "units", description: "Update a unit" },
  { name: "Delete Unit", code: "UNITS.DELETE", module: "units", description: "Delete a unit" },

  // Users
  { name: "View Users", code: "USERS.VIEW", module: "users", description: "View user list" },
  { name: "Update User", code: "USERS.UPDATE", module: "users", description: "Update a user" },
  { name: "Delete User", code: "USERS.DELETE", module: "users", description: "Delete a user" },

  // Vendors
  { name: "Create Vendor", code: "VENDORS.CREATE", module: "vendors", description: "Create a new vendor" },
  { name: "View Vendors", code: "VENDORS.VIEW", module: "vendors", description: "View vendor list" },
  { name: "Update Vendor", code: "VENDORS.UPDATE", module: "vendors", description: "Update vendor details" },
  { name: "Delete Vendor", code: "VENDORS.DELETE", module: "vendors", description: "Delete a vendor" },

  // Voucher Types
  { name: "Create Voucher Type", code: "VOUCHERTYPES.CREATE", module: "voucherTypes", description: "Create a voucher type" },
  { name: "View Voucher Types", code: "VOUCHERTYPES.VIEW", module: "voucherTypes", description: "View voucher types" },

  // Warehouses
  { name: "Create Warehouse", code: "WAREHOUSES.CREATE", module: "warehouses", description: "Create a new warehouse" },
  { name: "View Warehouses", code: "WAREHOUSES.VIEW", module: "warehouses", description: "View warehouses" },
  { name: "Update Warehouse", code: "WAREHOUSES.UPDATE", module: "warehouses", description: "Update a warehouse" },
  { name: "Delete Warehouse", code: "WAREHOUSES.DELETE", module: "warehouses", description: "Delete a warehouse" },
];

export default async function seedPermissions() {
  try {
    const count = await Permission.countDocuments();
    if (count > 0) {
      console.log(`[SEED] Permissions already exist (${count} found). Skipping.`);
      return;
    }

    const result = await Permission.insertMany(permissions, { ordered: false }).catch((err) => {
      if (err.code === 11000) {
        console.log("[SEED] Some permissions already exist (duplicate key). Continuing...");
        return { insertedCount: permissions.length - err.writeErrors?.length || 0 };
      }
      throw err;
    });

    const inserted = Array.isArray(result) ? result.length : result.insertedCount;
    console.log(`[SEED] Seeded ${inserted} permissions successfully.`);
  } catch (error) {
    console.error("[SEED] Error seeding permissions:", error.message);
  }
}
