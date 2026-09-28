import Image from "next/image";

/**
 * El logo real de Melera (la abeja en el hexágono, recortado de brand/melera-logo.png) sobre una
 * celda crema con luz cálida detrás, como las celdas operculadas del panal: así se ve bien sobre
 * el fondo oscuro.
 */
export default function LogoCelda({ tamano = 46 }: { tamano?: number }) {
  return (
    <span className="logo-celda" style={{ width: tamano, height: tamano * 1.1547 }} aria-hidden="true">
      <span className="logo-celda-fondo">
        <Image
          src="/brand/melera-logo-abeja.png"
          alt=""
          width={390}
          height={390}
          sizes={`${Math.round(tamano * 0.82)}px`}
          className="logo-celda-img"
        />
      </span>
    </span>
  );
}
