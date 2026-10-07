import { useCallback, useEffect, useState } from 'react';

export const MINIMO_BUSQUEDA = 3;
export const ESPERA_BUSQUEDA_MS = 400;

const comoTermino = (texto: string) => {
  const limpio = texto.trim();
  return limpio.length >= MINIMO_BUSQUEDA ? limpio : '';
};

/**
 * Texto del buscador y el término que de verdad se consulta: se actualiza 400 ms después de que
 * la persona deja de escribir, y solo con 3 caracteres o más. `buscarYa` lo aplica al instante
 * (tecla «Buscar» del teclado).
 */
export function useBusqueda() {
  const [texto, setTexto] = useState('');
  const [termino, setTermino] = useState('');

  useEffect(() => {
    const espera = setTimeout(() => setTermino(comoTermino(texto)), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(espera);
  }, [texto]);

  const buscarYa = useCallback(() => setTermino(comoTermino(texto)), [texto]);
  const limpiar = useCallback(() => {
    setTexto('');
    setTermino('');
  }, []);

  return { texto, setTexto, termino, buscarYa, limpiar };
}
