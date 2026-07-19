import {
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineReceiptPercent,
  HiOutlineShoppingBag,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineArrowTrendingUp,
} from "react-icons/hi2";
import logoIcon from "../../../../../assets/logo.png";
import styles from "../css/Sidebar.module.css";
import SidebarFooter from "./SidebarFooter";
import SidebarItem from "./SidebarItem";

const navigationItems = [
  { icon: HiOutlineHome, label: "Dashboard", to: "/dashboard", end: true },
  { icon: HiOutlineBanknotes, label: "Customers", to: "/dashboard/customers" },
  { icon: HiOutlineShoppingBag, label: "Vendors", to: "/dashboard/vendors" },
  { icon: HiOutlineSquares2X2, label: "Products", to: "/dashboard/products" },
  { icon: HiOutlineReceiptPercent, label: "Quotations", to: "/dashboard/quotations" },
  { icon: HiOutlineDocumentText, label: "Invoices", to: "/dashboard/invoices" },
  { icon: HiOutlineCreditCard, label: "Purchases", to: "/dashboard/purchases" },
  { icon: HiOutlineCurrencyDollar, label: "Accounts", to: "/dashboard/accounts" },
  { icon: HiOutlineBuildingStorefront, label: "Inventory", to: "/dashboard/inventory" },
  { icon: HiOutlineArrowTrendingUp, label: "Reports", to: "/dashboard/reports" },
  { icon: HiOutlineUserGroup, label: "Employees", to: "/dashboard/employees" },
  { icon: HiOutlineCog6Tooth, label: "Settings", to: "/dashboard/settings" },
];

export default function Sidebar({ isOpen, onClose, onLogout }) {
  return (
    <aside className={[styles.sidebar, isOpen && styles.open].filter(Boolean).join(" ")}>
      <div className={styles.inner}>
        <a aria-label="Duevora dashboard home" className={styles.brand} href="/dashboard">
          <img alt="Duevora" className={styles.brandLogo} src={logoIcon} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>DUEVORA</span>
            <span className={styles.brandTag}>SMART FINANCE. SIMPLIFIED.</span>
          </span>
        </a>
        <div className={styles.divider} />
        <nav aria-label="Dashboard navigation" className={styles.navigation}>
          {navigationItems.map((item) => (
            <SidebarItem key={item.label} onNavigate={onClose} {...item} />
          ))}
        </nav>
        <SidebarFooter onLogout={onLogout} />
      </div>
    </aside>
  );
}
