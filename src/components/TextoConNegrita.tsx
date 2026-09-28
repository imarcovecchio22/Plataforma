/** Texto de la config del cliente donde lo que va entre ** se muestra en negrita. */
export default function TextoConNegrita({ texto, className }: { texto: string; className?: string }) {
  return (
    <>
      {texto.split(/\*\*(.+?)\*\*/g).map((parte, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={className}>
            {parte}
          </strong>
        ) : (
          parte
        )
      )}
    </>
  );
}
