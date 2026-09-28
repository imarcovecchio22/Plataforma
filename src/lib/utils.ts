import { cliente } from "@/plataforma/cliente";

export function formatPrecio(pesos: number) {
  return new Intl.NumberFormat(cliente.region.locale, {
    style: "currency",
    currency: cliente.region.moneda,
    maximumFractionDigits: 0,
  }).format(pesos);
}

/** Fecha de hace `ms` milisegundos (para filtros "últimas 24 h", ventanas, etc.). */
export function haceMs(ms: number) {
  return new Date(Date.now() - ms);
}

export function formatFecha(fecha: Date | string) {
  return new Intl.DateTimeFormat(cliente.region.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: cliente.region.zonaHoraria,
  }).format(new Date(fecha));
}

export const ESTADOS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ESTADOS_COLOR: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  pagado: "bg-emerald-100 text-emerald-800",
  en_preparacion: "bg-blue-100 text-blue-800",
  enviado: "bg-indigo-100 text-indigo-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};
