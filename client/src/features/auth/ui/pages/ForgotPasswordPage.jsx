import { useNavigate } from "react-router";
import ForgotPasswordLayout from "../components/jsx/ForgotPasswordLayout";
import useAuth from "../../hooks/useAuth";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, isLoading } = useAuth();

  const handleSubmit = async (email) => {
    const result = await forgotPassword(email);
    if (result.success) {
      navigate("/verify-email", { state: { email } });
    }
  };

  return (
    <ForgotPasswordLayout
      onSubmit={handleSubmit}
      onBack={() => navigate("/login")}
      isLoading={isLoading}
    />
  );
}
