import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  HiMagnifyingGlass,
  HiPlus,
  HiOutlineBell,
  HiOutlineUserCircle,
  HiChevronDown,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
} from "react-icons/hi2";
import { useAppSelector } from "../../../../../app/store/hooks";
import s from "../css/Topbar.module.css";

export default function Topbar({ isMenuOpen, onMenuOpen, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const { user } = useAppSelector((state) => state.auth);

  const initials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <header>
      <button
        className={`${s.menu} ${isMenuOpen ? s.menuOpen : ""}`}
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
        onClick={onMenuOpen}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <label className={s.search}>
        <HiMagnifyingGlass />
        <input placeholder="Search anything..." type="search" />
        <kbd>Ctrl K</kbd>
      </label>

      <div className={s.actions}>
        <button aria-label="Notifications" onClick={() => navigate("/dashboard/notifications")} type="button">
          <HiOutlineBell />
        </button>
        <div className={s.profileWrap} ref={ref}>
          <button className={s.profile} aria-expanded={open} onClick={() => setOpen(!open)} type="button">
            <span className={s.avatar}>{initials}</span>
            <span className={s.name}>{user?.name || "User"}</span>
            <HiChevronDown className={[s.chevron, open && s.chevronOpen].filter(Boolean).join(" ")} />
          </button>
          {open && (
            <div className={s.drop} role="menu">
              <button onClick={() => { setOpen(false); navigate("/dashboard/profile"); }} type="button">
                <HiOutlineUserCircle />
                My Profile
              </button>
              <button onClick={() => { setOpen(false); navigate("/dashboard/settings"); }} type="button">
                <HiOutlineCog6Tooth />
                Settings
              </button>
              <div className={s.dropDivider} />
              <button className={s.dropLogout} onClick={onLogout} type="button">
                <HiOutlineArrowRightOnRectangle />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
