import { useSelector } from "react-redux";
import { HiOutlineUser, HiOutlineEnvelope, HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { PageHeader, Avatar, StatusBadge } from "..";
import s from "./Profile.module.css";

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className={s.page}>
      <PageHeader subtitle="Manage your account settings" title="Profile" />

      <div className={s.grid}>
        <div className={s.card}>
          <div className={s.header}>
            <Avatar name={user?.name || "U"} size={72} />
            <div>
              <h2 className={s.name}>{user?.name || "User"}</h2>
              <p className={s.email}>{user?.email || ""}</p>
              <StatusBadge status={user?.isVerified ? "active" : "pending"}>
                {user?.isVerified ? "Verified" : "Unverified"}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}>Account Details</h3>
          <div className={s.field}>
            <HiOutlineUser />
            <div>
              <span className={s.label}>Full Name</span>
              <span className={s.value}>{user?.name || "-"}</span>
            </div>
          </div>
          <div className={s.field}>
            <HiOutlineEnvelope />
            <div>
              <span className={s.label}>Email Address</span>
              <span className={s.value}>{user?.email || "-"}</span>
            </div>
          </div>
          <div className={s.field}>
            <HiOutlineBuildingOffice2 />
            <div>
              <span className={s.label}>Organization</span>
              <span className={s.value}>{user?.organizationId || "Not assigned"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
