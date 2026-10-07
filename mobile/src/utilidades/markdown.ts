// Lector mínimo de Markdown para mostrar textos legales: títulos (#, ##), viñetas (-),
// párrafos y negritas (**texto**). No pretende cubrir todo el lenguaje.
export interface ParteTexto {
  texto: string;
  negrita: boolean;
}

export interface BloqueTexto {
  tipo: 'titulo' | 'seccion' | 'parrafo' | 'vineta';
  partes: ParteTexto[];
}

function partesDe(linea: string): ParteTexto[] {
  return linea
    .split(/\*\*(.+?)\*\*/g)
    .map((texto, indice) => ({ texto, negrita: indice % 2 === 1 }))
    .filter((parte) => parte.texto.length > 0);
}

export function leerMarkdown(markdown: string): BloqueTexto[] {
  const bloques: BloqueTexto[] = [];
  for (const crudo of markdown.split('\n')) {
    const linea = crudo.trim();
    if (!linea) continue;
    if (linea.startsWith('## '))
      bloques.push({ tipo: 'seccion', partes: partesDe(linea.slice(3)) });
    else if (linea.startsWith('# '))
      bloques.push({ tipo: 'titulo', partes: partesDe(linea.slice(2)) });
    else if (linea.startsWith('- '))
      bloques.push({ tipo: 'vineta', partes: partesDe(linea.slice(2)) });
    else bloques.push({ tipo: 'parrafo', partes: partesDe(linea) });
  }
  return bloques;
}
