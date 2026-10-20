import { Texto, useFocoEnTitulo } from '../../../componentes';

/** Título de cada paso: al cambiar de paso, el lector de pantalla empieza aquí. */
export function TituloPaso({ texto }: { texto: string }) {
  const referencia = useFocoEnTitulo();
  return (
    <Texto ref={referencia} variante="subtitulo" accessibilityRole="header" testID="titulo-paso">
      {texto}
    </Texto>
  );
}
