import LoginFormulario from "@/components/admin/LoginFormulario";
import { getIdentidad } from "@/lib/identidad";

export default async function AdminLoginPage() {
  return <LoginFormulario logo={(await getIdentidad()).imagenes.logo} />;
}
