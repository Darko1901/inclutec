/** «88 %»: así se ve un porcentaje en pantalla (con espacio, como en CONTEXTO.md). */
export const formatearPorcentaje = (valor: number) => `${valor} %`;

/** «88 por ciento»: así lo lee el lector de pantalla. */
export const porcentajeHablado = (valor: number) => `${valor} por ciento`;

/** «45 min»: así se ve la duración de una entrevista en pantalla. */
export const duracionCorta = (minutos: number) => `${minutos} min`;

/** «45 minutos»: así lo lee el lector de pantalla. */
export const duracionHablada = (minutos: number) => `${minutos} minutos`;

/** Primera letra en mayúscula: la fecha larga («jueves 22 de octubre…») abre un título. */
export const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
