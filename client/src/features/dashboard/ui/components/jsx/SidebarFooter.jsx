import {
  HiChevronRight,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";
import { useAppSelector } from "../../../../../app/store/hooks";
import styles from "../css/Sidebar.module.css";

function AccountCard({ initials, title, subtitle, org }) {
  return (
    <button className={styles.accountCard} type="button">
      <span className={[styles.accountAvatar, org && styles.org].filter(Boolean).join(" ")}>
        {initials}
      </span>
      <span className={styles.accountDetails}>
        <span className={styles.accountName}>{title}</span>
        <span className={styles.accountSub}>{subtitle}</span>
      </span>
      <HiChevronRight className={styles.accountChevron} aria-hidden="true" />
    </button>
  );
}

export default function SidebarFooter({ onLogout }) {
  const { user } = useAppSelector((state) => state.auth);
  const initials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <footer className={styles.footer}>
      <div className={styles.divider} />
      <AccountCard
        initials="DV"
        org
        subtitle="Duevora Studio"
        title="ORG-DV-2026"
      />
      <AccountCard
        initials={initials}
        subtitle={user?.email || "user@duevora.com"}
        title={user?.name || "User"}
      />
      <button className={styles.logout} onClick={onLogout} type="button">
        <HiOutlineArrowRightOnRectangle aria-hidden="true" />
        <span>Logout</span>
      </button>
    </footer>
  );
}
