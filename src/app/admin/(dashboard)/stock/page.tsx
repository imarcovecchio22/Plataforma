import { redirect } from "next/navigation";

// "Precio y stock" pasó a /admin/productos (fase 2): los links viejos siguen andando.
export default function AdminStockPage() {
  redirect("/admin/productos");
}
