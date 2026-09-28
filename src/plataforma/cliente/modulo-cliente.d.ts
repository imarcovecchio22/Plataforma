// Tipos de "@cliente/*": cualquier cliente cumple el mismo esquema, así que el chequeo de tipos
// no depende de cuál se elige con CLIENTE.
declare module "@cliente/config" {
  const config: import("@/plataforma/cliente/esquema").ConfigCliente;
  export default config;
}
