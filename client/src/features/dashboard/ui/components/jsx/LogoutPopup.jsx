import { useEffect, useRef } from "react";
import { HiOutlineArrowRightOnRectangle } from "react-icons/hi2";
import s from "../css/LogoutPopup.module.css";
import useAuth from "../../../../auth/hooks/useAuth";

export default function LogoutPopup({ onClose }) {
  const r = useRef();
  const { logout } = useAuth();

  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    r.current?.focus();
    return () => removeEventListener("keydown", k);
  }, [onClose]);

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className={s.backdrop} onMouseDown={onClose} role="dialog" aria-modal="true">
      <section className={s.popup} onMouseDown={(e) => e.stopPropagation()}>
        <HiOutlineArrowRightOnRectangle />
        <h2>Logout?</h2>
        <p>Are you sure you want to logout?</p>
        <div>
          <button ref={r} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={s.primary} onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
        <i />
        <button className={s.all} onClick={handleLogout} type="button">
          Logout from all devices
        </button>
      </section>
    </div>
  );
}
