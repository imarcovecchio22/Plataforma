import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import { getIdentidad } from "@/lib/identidad";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-marca-50/40">
      <AdminNav logo={(await getIdentidad()).imagenes.logo} />
      <main className="contenedor py-8">{children}</main>
    </div>
  );
}
