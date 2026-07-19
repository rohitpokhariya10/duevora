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
  HiOutlineQuestionMarkCircle,
} from "react-icons/hi2";
import { useAppSelector } from "../../../../../app/store/hooks";
import s from "../css/Topbar.module.css";

export default function Topbar({ isMenuOpen, onMenuOpen, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const { user } = useAppSelector((state) => state.auth);

  const userFirstName = user?.name ? user.name.split(" ")[0] : "Bhavya";

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
    <header className={s.header}>
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

      <div className={s.greeting}>
        <h2 className={s.welcomeText}>Good morning, {userFirstName}</h2>
        <p className={s.welcomeSubText}>Here's what's happening with your business today.</p>
      </div>

      <div className={s.rightSection}>
        <label className={s.search}>
          <HiMagnifyingGlass />
          <input placeholder="Search anything..." type="search" />
          <kbd>⌘K</kbd>
        </label>

        <div className={s.actions}>
          <button className={s.plusBtn} aria-label="Add New" onClick={() => navigate("/dashboard/invoices")} type="button">
            <HiPlus />
          </button>
          
          <button className={s.bellBtn} aria-label="Notifications" onClick={() => navigate("/dashboard/notifications")} type="button">
            <HiOutlineBell />
            <span className={s.badge}>3</span>
          </button>

          <button className={s.helpBtn} aria-label="Help" type="button">
            <HiOutlineQuestionMarkCircle />
          </button>

          <div className={s.profileWrap} ref={ref}>
            <button className={s.profile} aria-expanded={open} onClick={() => setOpen(!open)} type="button">
              <span className={s.avatar}>{initials}</span>
              <HiChevronDown className={[s.chevron, open && s.chevronOpen].filter(Boolean).join(" ")} />
            </button>
            {open && (
              <div className={s.drop} role="menu">
                <div className={s.userInfo}>
                  <p className={s.userEmailName}>{user?.name || "Bhavya Dhanwani"}</p>
                  <p className={s.userEmailSub}>{user?.email || "bhavya@duevora.com"}</p>
                </div>
                <div className={s.dropDivider} />
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
      </div>
    </header>
  );
}
