import { getMainProduct } from "@/lib/product";
import StockEditor from "@/components/admin/StockEditor";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const product = await getMainProduct();

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-2xl font-semibold text-oscuro">Precio y stock</h1>
      <p className="mt-1 text-sm text-stone-500">
        El precio se usa en la tienda, en /consultas, en el chat y en las respuestas automáticas de Instagram.
      </p>

      <div className="mt-6">
        <StockEditor product={product} />
      </div>
    </div>
  );
}
