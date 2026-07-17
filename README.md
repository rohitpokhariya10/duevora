# Duevora Application Docker Configuration

This project is configured with a fully containerized Docker workflow for both **Development** and **Production** environments, using an external MongoDB instance (e.g. MongoDB Atlas) via the `MONGO_URI` environment variable.

---

## 🛠️ Development Environment

The development environment runs the client (Vite + React) and the server (Node + Express) in separate, hot-reloading containers.

### Features
* **Zero-Rebuild Code Updates**: The project directories are bind-mounted into the containers. Any edits you make on your local system will immediately update in the container.
* **Automatic `node_modules` Sync**: If you modify `package.json` (e.g. add/update/remove a dependency), a lightweight watcher script inside the container (`watch-package.js`) will detect the change, temporarily stop the app, run `npm install` inside the container, and restart the app. **You do not need to rebuild the containers when dependencies change!**
* **Vite HMR on Windows**: Vite is configured with polling enabled, ensuring HMR works perfectly even when coding on a Windows host.

### How to Run (Development)

1. Make sure you have **Docker** and **Docker Compose** installed.
2. Add your Atlas connection string to the `.env` file inside the `server` directory (`server/.env`):
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/duevora
   ```
3. Start the development environment:
   ```bash
   docker compose up
   ```
4. Open your browser:
   * **Frontend (Vite Dev Server)**: [http://localhost:5173](http://localhost:5173)
   * **Backend API Server**: [http://localhost:3000](http://localhost:3000)

### Stopping the Dev Server
Press `Ctrl + C` or run:
```bash
docker compose down
```

---

## 🚀 Production Environment

In production, the app is packaged into a **single, highly-optimized container** where the Express backend serves the pre-built React frontend assets from the backend's `public/` directory.

### Features
* **Multi-stage Build**: A build stage compiles the frontend into static assets (`dist` directory). A final production stage copies these assets to the server's `public/` directory and exposes the Express app.
* **Minimal Footprint**: Uses `node:20-alpine` and only installs production dependencies (`--only=production`) in the final image.
* **Production Static Serving**: The backend automatically serves the static assets and routes client-side routing fallback endpoints to React's `index.html`.

### How to Run (Production)

1. Start the production container (make sure your database connection is defined in `server/.env`):
   ```bash
   docker compose -f docker-compose.prod.yml up --build
   ```

2. Open the application:
   * Both frontend and backend are unified on port 3000: [http://localhost:3000](http://localhost:3000)

To build and run the standalone production image directly without compose:
```bash
# Build the image
docker build -t duevora-prod .

# Run the image, passing the Atlas connection string
docker run -p 3000:3000 -e MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/duevora" duevora-prod
```

---

## 📁 Architecture and Ports Summary

* **Frontend Container (Dev)**:
  * Port: `5173` (mapped from inside Vite `0.0.0.0:5173`)
  * Command: Runs `watch-package.js npm run dev -- --host`
  * Proxy: Configured to forward all `/api` requests to backend at `http://server:3000`

* **Backend Container (Dev & Prod)**:
  * Port: `3000` (mapped from Express server)
  * Dev Command: Runs `watch-package.js npm run dev` (starts Nodemon)
  * Prod Command: Runs `node server.js`
  * Database: Connects to external MongoDB (MongoDB Atlas) specified by `MONGO_URI`

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Authentication uses **JWT Bearer tokens**. The `organizationId` is resolved automatically from the token — never pass it in the body or headers.

### Global Response Format

```json
// Success
{ "success": true, "message": "...", "data": {} }

// Error
{ "success": false, "message": "...", "errors": [{ "field": "email", "issue": "Invalid" }] }
```

---

### 🔐 Module 1 — Identity & Access Management

| Endpoint | Method | Auth | Input | Output | Use |
|---|---|---|---|---|---|
| `/api/auth/signup` | POST | Public | `name`, `email`, `password`, `organizationName`, `organizationCode` | `user`, `organization` | Register a new user |
| `/api/auth/login` | POST | Public | `email`, `password` | `accessToken`, `refreshToken`, `userId` | Authenticate & get tokens |
| `/api/auth/refresh` | POST | Public | `refreshToken` | New `accessToken` | Renew expired token |
| `/api/organization` | POST | Bearer | `name`, `code`, `firstName`, `lastName`, `address?` | `user`, `org`, `employee`, `accessToken` | Onboard new organisation |
| `/api/organization` | GET | Bearer + `organization.view` | — | Organisation document | Fetch org details |
| `/api/users` | GET | Bearer + `users.view` | `page`, `limit`, `search` | Users array + pagination | List all users |
| `/api/users/:userId` | PUT | Bearer + `users.update` | Any user fields | Updated user | Update user profile |
| `/api/users/:userId` | DELETE | Bearer + `users.delete` | — | Confirmation | Soft-delete user |
| `/api/employees` | POST | Bearer + `employees.create` | `employeeCode`, `firstName`, `lastName`, `email`, `departmentId?` | Created employee | Create employee record |
| `/api/employees/invite` | POST | Bearer + `employees.create` | `email`, `roleId` | Invite token + link | Send email invitation |
| `/api/employees/bulk-import` | POST | Bearer + `employees.create` | `employees[]` array | Created employees | Import employees in bulk |
| `/api/departments` | POST | Bearer + `departments.create` | `name`, `code` | Created department | Create a department |
| `/api/roles` | POST | Bearer + `roles.create` | `name`, `code` | Created role | Create RBAC role |
| `/api/roles/:roleId/permissions` | POST | Bearer | `permissionIds[]` | Role-permission mapping | Bind permissions to role |

---

### 🗂️ Module 2 — Master Data Management

| Endpoint | Method | Auth | Input | Output | Use |
|---|---|---|---|---|---|
| `/api/customers` | POST | Bearer + `customers.create` | `name`, `email?`, `phone?`, `gstin?` | Created customer | Add a customer |
| `/api/customers` | GET | Bearer + `customers.view` | `page`, `limit`, `search` | Customers + pagination | List all customers |
| `/api/customers/:id` | GET | Bearer + `customers.view` | — | Customer object | Get single customer |
| `/api/customers/:id` | PUT | Bearer + `customers.update` | Any customer fields | Updated customer | Update customer |
| `/api/customers/:id` | DELETE | Bearer + `customers.delete` | — | Confirmation | Soft-delete customer |
| `/api/customers/bulk-import` | POST | Bearer + `customers.create` | `customers[]` | Created customers | Bulk import |
| `/api/customers/bulk-delete` | DELETE | Bearer + `customers.delete` | `customerIds[]` | Delete count | Bulk soft-delete |
| `/api/vendors` | POST/GET/PUT/DELETE | Bearer | Same as customers | Same as customers | Full CRUD for vendors |
| `/api/vendors/bulk-import` | POST | Bearer | `vendors[]` | Created vendors | Bulk import vendors |
| `/api/vendors/bulk-update` | PATCH | Bearer | `vendors[]` | Updated vendors | Bulk update vendors |
| `/api/categories` | POST | Bearer + `categories.create` | `name`, `parentId?` | Created category | Create product category |
| `/api/units` | POST | Bearer + `units.create` | `name`, `code` | Created unit | Create unit of measure |
| `/api/products` | POST | Bearer + `products.create` | `name`, `sku`, `categoryId`, `unitId`, `sellingPrice`, `costPrice`, `taxId?` | Created product | Add product to catalog |
| `/api/products` | GET | Bearer + `products.view` | `page`, `limit`, `search` | Products + pagination | List products |
| `/api/products/:id` | GET/PUT/DELETE | Bearer | — / product fields / — | Product / Updated / Confirmation | Single product CRUD |
| `/api/products/bulk-import` | POST | Bearer | `products[]` | Created products | Bulk import products |
| `/api/warehouses` | POST | Bearer + `warehouses.create` | `name`, `code`, `address?` | Created warehouse | Register storage location |
| `/api/currencies` | POST | Bearer + `currencies.create` | `name`, `code`, `symbol` | Created currency | Add currency |
| `/api/exchange-rates` | POST | Bearer + `exchangeRates.create` | `currencyId`, `rate`, `effectiveDate` | Created rate record | Record exchange rate |
| `/api/taxes` | POST | Bearer + `taxes.create` | `name`, `rate`, `type` | Created tax | Define tax rate |

---

### 📦 Module 3 — Inventory & Stock Management

| Endpoint | Method | Auth | Input | Output | Use |
|---|---|---|---|---|---|
| `/api/inventory` | GET | Bearer + `inventory.view` | `warehouseId?`, `productId?` | `[{ product, warehouse, quantity }]` | View current stock levels |
| `/api/stock-movements` | GET | Bearer + `stockMovements.view` | `productId?`, `warehouseId?` | Movement records | Full stock audit trail |
| `/api/stock-adjustments` | POST | Bearer + `stockAdjustments.create` | `warehouseId`, `productId`, `quantityChange`, `reason` | Adjustment (`Draft`) | Manual stock correction |
| `/api/stock-adjustments/:id/approve` | POST | Bearer + `stockAdjustments.approve` | — | Adjustment (`Completed`) + inventory update | Apply the adjustment |
| `/api/stock-transfers` | POST | Bearer + `stockTransfers.create` | `sourceWarehouseId`, `destinationWarehouseId`, `productId`, `quantity` | Transfer (`Pending Transit`) | Initiate stock move |
| `/api/stock-transfers/:id/approve` | POST | Bearer + `stockTransfers.approve` | — | Transfer (`Received`) + inventory update | Complete the transfer |

---

### 🛒 Module 4 — Sales & Procurement Documents

| Endpoint | Method | Auth | Input | Output | Use |
|---|---|---|---|---|---|
| `/api/quotations` | POST | Bearer + `quotations.create` | `customerId`, `items[]`, `validUntil?` | Quotation (`Draft`) | Create price quote |
| `/api/quotations/:id/approve` | POST | Bearer + `quotations.approve` | — | Quotation (`Accepted`) | Accept the quote |
| `/api/sales-orders` | POST | Bearer + `salesOrders.create` | `customerId`, `items[]`, `quotationId?` | Sales Order (`Draft`) | Create sales order |
| `/api/sales-orders/:id/approve` | POST | Bearer + `salesOrders.approve` | — | Order (`Processing`) | Confirm order |
| `/api/delivery-challans` | POST | Bearer + `deliveryChallans.create` | `salesOrderId`, `items[]`, `dispatchDate` | Delivery challan | Dispatch goods |
| `/api/invoices` | POST | Bearer + `invoices.create` | `customerId`, `items[]`, `dueDate` | Invoice (`Draft`) | Create customer invoice |
| `/api/invoices/:id/approve` | POST | Bearer + `invoices.approve` | — | Invoice + journal entries + stock decrement | Post the invoice |
| `/api/purchase-orders` | POST | Bearer + `purchaseOrders.create` | `vendorId`, `items[]`, `expectedDate?` | PO (`Draft`) | Raise vendor PO |
| `/api/purchases` | POST | Bearer + `purchases.create` | `vendorId`, `purchaseOrderId?`, `items[]`, `billDate` | Purchase (`Draft`) | Record vendor bill |
| `/api/purchases/:id/approve` | POST | Bearer + `purchases.approve` | — | Purchase + stock increment + journal entries | Confirm receipt |

---

### 🏦 Module 5 — Treasury & Cash Management

| Endpoint | Method | Auth | Input | Output | Accounting Entry |
|---|---|---|---|---|---|
| `/api/payments` | POST | Bearer + `payments.create` | `vendorId`, `bankAccountId`, `amount`, `paymentDate`, `method` | Payment + ledger entry | Debit AP / Credit Bank |
| `/api/receipts` | POST | Bearer + `receipts.create` | `customerId`, `bankAccountId`, `amount`, `receiptDate`, `method` | Receipt + ledger entry | Debit Bank / Credit AR |
| `/api/expenses` | POST | Bearer + `expenses.create` | `expenseAccountId`, `bankAccountId`, `amount`, `date`, `description` | Expense + ledger entry | Debit Expense / Credit Bank |
| `/api/incomes` | POST | Bearer + `incomes.create` | `incomeAccountId`, `bankAccountId`, `amount`, `date`, `description` | Income + ledger entry | Debit Bank / Credit Income |
| `/api/bank-accounts` | POST | Bearer + `bankAccounts.create` | `name`, `accountNumber`, `bankName`, `ifscCode?`, `openingBalance?` | Created bank account | — |
| `/api/bank-transactions` | POST | Bearer + `bankTransactions.create` | `bankAccountId`, `amount`, `type`, `date`, `description` | Created transaction | — |
| `/api/reminders` | POST | Bearer + `reminders.create` | `title`, `dueDate`, `description?` | Created reminder | — |

---

### 📒 Module 6 — General Ledger & Accounting

| Endpoint | Method | Auth | Input | Output | Use |
|---|---|---|---|---|---|
| `/api/accounts` | POST | Bearer + `accounts.create` | `name`, `code`, `type` (`Asset`/`Liability`/`Equity`/`Revenue`/`Expense`), `parentId?` | Created account | Build chart of accounts |
| `/api/journal-entries` | POST | Bearer + `journalEntries.create` | `date`, `description`, `lines[]` (`accountId`, `debit`, `credit`) | Journal entry (`Posted`) | Manual double-entry bookkeeping |
| `/api/ledger` | GET | Bearer + `ledger.view` | `accountId`, `startDate?`, `endDate?`, `page`, `limit` | Ledger entries + running balance | View account statement |
| `/api/voucher-types` | POST | Bearer + `voucherTypes.create` | `name`, `prefix`, `type` | Created voucher type | Define custom voucher prefix |
| `/api/financial-years` | POST | Bearer + `financialYears.create` | `name`, `startDate`, `endDate` | Financial year (`isClosed: false`) | Open a new FY period |
| `/api/financial-years/:id/archive` | POST | Bearer + `financialYears.archive` | — | Financial year (`isClosed: true`) | Lock the FY permanently |
| `/api/opening-balances` | POST | Bearer + `openingBalances.create` | `accountId`, `financialYearId`, `debit`, `credit` | Created opening balance | Set account starting balance |
| `/api/cost-centers` | POST | Bearer + `costCenters.create` | `name`, `code` | Created cost center | Tag expenses to cost centers |
| `/api/projects` | POST | Bearer + `projects.create` | `name`, `code`, `startDate?`, `endDate?` | Created project | Track project-level P&L |
| `/api/budgets` | POST | Bearer + `budgets.create` | `accountId`, `financialYearId`, `amount` | Created budget | Set account budget cap |

---

### 🔔 Module 7 — Utility & Metadata

| Endpoint | Method | Auth | Input | Output | Use |
|---|---|---|---|---|---|
| `/api/notifications` | GET | Bearer | `page`, `limit`, `isRead?` | Notification array | In-app notification feed |
| `/api/audit-logs` | GET | Bearer + `auditLogs.view` | `resourceType?`, `resourceId?`, `page`, `limit` | Audit log entries | Full mutation history |
| `/api/settings` | PUT | Bearer + `settings.update` | `key`, `value` | Saved setting | Upsert org-level config |

---

### 📊 Module 8 — Reports

All reports use **MongoDB Aggregation Pipelines** on `LedgerEntry`. All accept optional `startDate` / `endDate` query params.

| Endpoint | Output | Use |
|---|---|---|
| `GET /api/reports/trial-balance` | `[{ account, totalDebit, totalCredit, balance }]` | Verify books balance |
| `GET /api/reports/profit-loss` | `{ revenue, expenses, netProfit }` | P&L for any date range |
| `GET /api/reports/balance-sheet` | `{ assets, liabilities, equity }` | Financial position snapshot |
| `GET /api/reports/cash-flow` | `{ inflow, outflow, netCashFlow }` | Net cash movement |

---

## 🗺️ System Architecture & API Flow Diagram

```mermaid
flowchart TD
    subgraph IAM["🔐 Identity & Access Management"]
        AUTH["POST /auth/signup\nPOST /auth/login\nPOST /auth/refresh"]
        ORG["POST /organization\nGET /organization"]
        USERS["GET PUT DELETE /users"]
        EMP["POST /employees\nPOST /employees/invite\nPOST /employees/bulk-import"]
        ROLES["POST /roles\nPOST /roles/:id/permissions"]
    end

    subgraph MASTER["🗂️ Master Data"]
        CUST["CRUD /customers"]
        VEND["CRUD /vendors"]
        PROD["CRUD /products"]
        WH["POST /warehouses"]
        TAX["POST /taxes"]
        CUR["POST /currencies\nPOST /exchange-rates"]
    end

    subgraph STOCK["📦 Inventory"]
        INV["GET /inventory"]
        SM["GET /stock-movements"]
        SA["POST /stock-adjustments\nPOST .../approve"]
        ST["POST /stock-transfers\nPOST .../approve"]
    end

    subgraph SALES["🛒 Sales Pipeline"]
        QUOT["POST /quotations → approve"]
        SO["POST /sales-orders → approve"]
        DC["POST /delivery-challans"]
        INV2["POST /invoices → approve"]
        REC["POST /receipts"]
    end

    subgraph PROC["📋 Procurement Pipeline"]
        PO["POST /purchase-orders"]
        PUR["POST /purchases → approve"]
        PAY["POST /payments"]
    end

    subgraph TREASURY["🏦 Treasury"]
        EXP["POST /expenses"]
        INC["POST /incomes"]
        BA["POST /bank-accounts"]
        BT["POST /bank-transactions"]
    end

    subgraph GL["📒 General Ledger"]
        ACC["POST /accounts"]
        JE["POST /journal-entries"]
        LED["GET /ledger"]
        FY["POST /financial-years\nPOST .../archive"]
        OB["POST /opening-balances"]
    end

    subgraph RPT["📊 Reports"]
        TB["GET /reports/trial-balance"]
        PL["GET /reports/profit-loss"]
        BS["GET /reports/balance-sheet"]
        CF["GET /reports/cash-flow"]
    end

    subgraph UTIL["🔔 Utility"]
        NOTIF["GET /notifications"]
        AUDIT["GET /audit-logs"]
        SET["PUT /settings"]
    end

    %% Auth gates everything
    AUTH -->|"JWT issued"| ORG & USERS & EMP & ROLES

    %% Master data feeds documents
    CUST -->|"customer ref"| QUOT & INV2 & REC
    VEND -->|"vendor ref"| PO & PUR & PAY
    PROD -->|"line items"| QUOT & INV2 & PUR
    WH -->|"location"| INV & SA & ST
    TAX -->|"applied to"| QUOT & INV2 & PUR

    %% Sales flow
    QUOT -->|"accepted"| SO
    SO -->|"confirmed"| DC
    DC -->|"updates stock"| INV
    SO -->|"billed"| INV2
    INV2 -->|"approve → posts"| JE
    REC -->|"clears AR"| JE

    %% Procurement flow
    PO -->|"approved"| PUR
    PUR -->|"approve → increments"| INV
    PUR -->|"posts AP"| JE
    PAY -->|"settles AP"| JE

    %% Treasury → Ledger
    EXP & INC & BT -->|"ledger entries"| JE
    BA -->|"bank account"| PAY & REC & EXP & INC

    %% Stock logs
    SA & ST -->|"approve → logs"| SM
    SA & ST -->|"approve → updates"| INV

    %% Ledger chain
    JE -->|"posts to"| LED
    ACC -->|"account tree"| JE & LED
    FY -->|"period scope"| OB
    FY -->|"archive locks"| LED

    %% Reports read ledger
    LED -->|"aggregated"| TB & PL & BS & CF

    %% Utility observes
    AUDIT -.->|"monitors"| SALES & PROC & GL & STOCK
    NOTIF -.->|"alerts"| SALES & PROC
    SET -.->|"configures"| ORG
```

---

## 🧪 Running Tests

```bash
# Full suite (622 tests across 105 suites)
npm test

# DAO unit tests only
npm run test:dao

# Per-feature (examples)
npm run test:auth
npm run test:customers
npm run test:invoices
npm run test:financial-years
npm run test:reports
# Full list of commands is in server/package.json
```

> **Tip:** `BCRYPT_ROUNDS=1` in `server/.env` makes tests ~60–70% faster. Use `10+` in production.
