import { HiOutlineShieldCheck } from "react-icons/hi2";
import { Button } from "..";
import { useNavigate } from "react-router";
import s from "./AccessDenied.module.css";

export default function AccessDenied({ permission }) {
  const navigate = useNavigate();

  return (
    <div className={s.page}>
      <div className={s.iconWrap}>
        <HiOutlineShieldCheck />
      </div>
      <h2 className={s.title}>Access Denied</h2>
      <p className={s.desc}>
        You don't have permission to access this page.
        {permission && (
          <span className={s.permission}>Required: {permission}</span>
        )}
      </p>
      <p className={s.hint}>
        Contact your administrator to request access.
      </p>
      <Button onClick={() => navigate("/dashboard")} variant="primary">
        Back to Dashboard
      </Button>
    </div>
  );
}
