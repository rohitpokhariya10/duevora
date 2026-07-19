import {
  HiChevronUpDown,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBuildingStorefront,
} from "react-icons/hi2";
import { useAppSelector } from "../../../../../app/store/hooks";
import { useQuery } from "@tanstack/react-query";
import { organizationApi } from "../../../../organization/api/organizationApi";
import styles from "../css/Sidebar.module.css";

function AccountCard({ initials, title, subtitle, org, isUser }) {
  return (
    <button className={styles.accountCard} type="button">
      <span className={[styles.accountAvatar, org && styles.org].filter(Boolean).join(" ")}>
        {org ? (
          <HiOutlineBuildingStorefront style={{ fontSize: "16px" }} />
        ) : (
          initials
        )}
      </span>
      <span className={styles.accountDetails}>
        <span className={styles.accountName}>{title}</span>
        <span className={styles.accountSub}>{subtitle}</span>
      </span>
      <HiChevronUpDown className={styles.accountChevron} aria-hidden="true" />
    </button>
  );
}

export default function SidebarFooter({ onLogout }) {
  const { user } = useAppSelector((state) => state.auth);

  const { data: orgData } = useQuery({
    queryKey: ["organization"],
    queryFn: organizationApi.get,
    enabled: !!user?.organizationId,
  });

  const orgInfo = orgData?.data;

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
        org
        subtitle={orgInfo?.code || "Loading..."}
        title={orgInfo?.name || "Loading..."}
      />
      <AccountCard
        isUser
        initials={initials}
        subtitle="Administrator"
        title={user?.name || "User"}
      />
      <button className={styles.logout} onClick={onLogout} type="button">
        <HiOutlineArrowRightOnRectangle aria-hidden="true" />
        <span>Logout</span>
      </button>
    </footer>
  );
}
