import { useLocation, useNavigate } from "react-router";
import VerifyEmailLayout from "../components/jsx/VerifyEmailLayout";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "your email";

  const handleVerify = (code) => {
    console.log("Verifying code:", code);
    // TODO: call verifyEmail API
    navigate("/login");
  };

  return <VerifyEmailLayout email={email} onVerify={handleVerify} />;
}
