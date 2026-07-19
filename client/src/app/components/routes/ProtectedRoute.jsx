import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { useAppSelector } from "../../store/hooks";
import useAuth from "../../../features/auth/hooks/useAuth";

export default function ProtectedRoute({ requireVerified = false, requireOnboarding = false }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { restoreSession } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    restoreSession().finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [restoreSession]);

  if (checking) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#475569", fontWeight: 650 }}>Loading your workspace…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireVerified && !user?.isVerified) return <Navigate to="/verify-email" replace />;
  if (requireOnboarding && !user?.organizationId) return <Navigate to="/onboard" replace />;
  return <Outlet />;
}