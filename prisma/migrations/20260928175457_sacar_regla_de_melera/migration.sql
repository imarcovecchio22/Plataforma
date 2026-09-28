-- La migración 20260925000100_regla_inicial_como_manychat insertaba en cualquier base la regla de
-- bienvenida de Melera (textos y links de Melera). Con la plataforma, los datos iniciales de cada
-- cliente van en su seed (clientes/<slug>/seed.ts; la de Melera está en clientes/melera/seed.ts).
-- Esta migración la borra, pero solo si sigue tal cual se insertó: desactivada y sin cambios. Si
-- alguien la activó o la editó (como en la producción de Melera), se queda.
DELETE FROM "AutoRespuesta"
WHERE "nombre" = 'Bienvenida (como ManyChat)'
  AND "activa" = false
  AND "prioridad" = 10
  AND "coincidencia" = 'contiene'
  AND "canal" = 'ambos'
  AND "palabrasClave" = ARRAY['miel', 'precio', 'comprar', 'pedido', 'info']
  AND "respuesta" = '¡Hola! 🐝 Gracias por escribirle a Melera. Tenemos miel artesanal pura de Tomás Jofré, frasco de 500 g a $PRECIO. ¿En qué te ayudamos?'
  AND "botones" = '[{"titulo": "🍯 Quiero comprar", "url": "https://melera.vercel.app/producto?origen=instagram"}, {"titulo": "💬 Tengo una consulta", "url": "https://melera.vercel.app/consultas?origen=instagram"}]'::jsonb
  AND "respuestaPublicaComentario" = '¡Te mandamos un DM! 🐝';
