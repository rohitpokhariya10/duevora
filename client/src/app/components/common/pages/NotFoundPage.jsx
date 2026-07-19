import { useNavigate } from "react-router";
import { HiOutlineHome } from "react-icons/hi2";
import { Button } from "..";
import s from "./NotFound.module.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={s.page}>
      <div className={s.content}>
        <span className={s.code}>404</span>
        <h1 className={s.title}>Page Not Found</h1>
        <p className={s.desc}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button icon={HiOutlineHome} onClick={() => navigate("/dashboard")} variant="primary">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
