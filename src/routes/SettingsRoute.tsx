import SettingsPage, { settingsSections } from "@/features/settings/pages/SettingsPage";
import { Navigate, useLocation, useParams } from "react-router-dom";

export default function SettingsRoute() {
  const { section } = useParams();
  const { hash } = useLocation();
  const current = settingsSections.find((item) => item.id === section);
  if (!current) return <Navigate to={{ pathname: "/settings/general", hash }} replace />;
  return <SettingsPage section={current.id} />;
}
