"""PDF y XLSX de GET /admin/estadisticas/exportar, con las mismas cifras del resumen.

Mismas tablas y orden que el mock del panel (web/app/Servicios/Api/Mock/ExportadorEstadisticas.php).
"""

import io
import unicodedata

from fpdf import FPDF
from openpyxl import Workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Font

from app.esquemas.estadisticas import Estadisticas

TIPO_PDF = "application/pdf"
TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

ESTADOS_POSTULACION = {
    "postulada": "Postulada",
    "en_revision": "En revisión",
    "entrevista": "Entrevista",
    "aceptada": "Aceptada",
    "no_seleccionada": "No seleccionada",
    "retirada": "Retirada",
}

Tabla = tuple[str, list[str], list[list[int | float | str]]]


def tablas(e: Estadisticas) -> list[Tabla]:
    """Las tablas del reporte, en el orden de la pantalla: (título, columnas, filas)."""
    i, g, p = e.indicadores, e.graficas, e.pendientes
    return [
        (
            "Indicadores",
            ["Indicador", "Valor"],
            [
                ["Candidatos activos", i.candidatos_activos],
                ["Empresas validadas", i.empresas_validadas],
                ["Vacantes publicadas", i.vacantes_publicadas],
                ["Postulaciones del periodo", i.postulaciones],
                ["Contrataciones del periodo", i.contrataciones],
                ["Tasa de colocación (%)", i.tasa_colocacion],
                ["Empresas por validar", p.empresas_por_validar],
                ["Reportes abiertos", p.reportes_abiertos],
            ],
        ),
        (
            "Postulaciones por estado",
            ["Estado", "Postulaciones"],
            [
                [ESTADOS_POSTULACION.get(f.etiqueta, f.etiqueta), f.total]
                for f in g.postulaciones_por_estado
            ],
        ),
        (
            "Vacantes por modalidad",
            ["Modalidad", "Vacantes"],
            [[f.etiqueta, f.total] for f in g.vacantes_por_modalidad],
        ),
        (
            "Vacantes por categoría",
            ["Categoría", "Vacantes"],
            [[f.etiqueta, f.total] for f in g.vacantes_por_categoria],
        ),
        (
            "Evolución mensual",
            ["Mes", "Postulaciones", "Contrataciones"],
            [[f.mes, f.postulaciones, f.contrataciones] for f in g.evolucion_mensual],
        ),
        (
            "Brecha de ajustes",
            ["Ajuste", "Solicitados por candidatos", "Ofrecidos en vacantes"],
            [[f.etiqueta, f.solicitados, f.ofrecidos] for f in g.brecha_ajustes],
        ),
        (
            "Brecha de habilidades",
            ["Habilidad", "Demandadas en vacantes", "Registradas por candidatos"],
            [[f.etiqueta, f.demandadas, f.registradas] for f in g.brecha_habilidades],
        ),
    ]


def nombre(e: Estadisticas, formato: str) -> str:
    return f"estadisticas_{e.periodo.desde.isoformat()}_{e.periodo.hasta.isoformat()}.{formato}"


_EQUIVALENTES = str.maketrans(
    {"—": "-", "–": "-", "“": '"', "”": '"', "‘": "'", "’": "'", "…": "..."}
)


def _latin(texto: str) -> str:
    """Las fuentes básicas del PDF solo cubren Latin-1 (acentos, ñ, «»): lo demás se aproxima."""
    texto = unicodedata.normalize("NFC", texto).translate(_EQUIVALENTES)
    return texto.encode("latin-1", "replace").decode("latin-1")


def _fecha(valor) -> str:
    return valor.strftime("%d/%m/%Y")


def _recortar(documento: FPDF, texto: str, ancho: float) -> str:
    """Una etiqueta muy larga se recorta para no salirse de su celda."""
    if documento.get_string_width(texto) <= ancho:
        return texto
    while texto and documento.get_string_width(texto + "...") > ancho:
        texto = texto[:-1]
    return texto + "..."


def pdf(e: Estadisticas) -> bytes:
    documento = FPDF("P", "mm", "A4")
    documento.set_title("IncluTec - Estadísticas")
    documento.set_author("IncluTec")
    documento.set_margins(15, 15, 15)
    documento.set_auto_page_break(True, 15)
    documento.add_page()

    documento.set_font("Helvetica", "B", 18)
    documento.cell(0, 10, _latin("IncluTec · Estadísticas"), new_x="LMARGIN", new_y="NEXT")
    documento.set_font("Helvetica", "", 11)
    periodo = f"Periodo: del {_fecha(e.periodo.desde)} al {_fecha(e.periodo.hasta)}"
    documento.cell(0, 7, _latin(periodo), new_x="LMARGIN", new_y="NEXT")
    aviso = "Solo datos agregados; no identifican a ninguna persona."
    documento.cell(0, 7, _latin(aviso), new_x="LMARGIN", new_y="NEXT")
    documento.ln(4)

    for titulo, columnas, filas in tablas(e):
        n = len(columnas)
        primera = 120 if n == 2 else 180 - 35 * (n - 1)
        anchos = [primera] + [(180 - primera) / (n - 1)] * (n - 1)

        documento.set_font("Helvetica", "B", 13)
        documento.cell(0, 9, _latin(titulo), new_x="LMARGIN", new_y="NEXT")
        documento.set_font("Helvetica", "B", 9)
        documento.set_fill_color(229, 231, 235)
        for ancho, columna in zip(anchos, columnas, strict=True):
            documento.cell(ancho, 7, _latin(columna), border=1, fill=True)
        documento.ln()

        documento.set_font("Helvetica", "", 10)
        for fila in filas:
            for posicion, (ancho, valor) in enumerate(zip(anchos, fila, strict=True)):
                texto = _recortar(documento, _latin(str(valor)), ancho - 2)
                documento.cell(ancho, 7, texto, border=1, align="L" if posicion == 0 else "R")
            documento.ln()
        if not filas:
            documento.cell(180, 7, _latin("Sin datos en el periodo."), border=1)
            documento.ln()
        documento.ln(5)

    return bytes(documento.output())


def _celda(valor):
    """Texto siempre como texto: un «=» al inicio no se vuelve fórmula en Excel."""
    if isinstance(valor, str):
        return ILLEGAL_CHARACTERS_RE.sub("", valor)
    return valor


def xlsx(e: Estadisticas) -> bytes:
    libro = Workbook()
    libro.remove(libro.active)
    libro.properties.title = "IncluTec - Estadísticas"
    libro.properties.creator = "IncluTec"
    periodo = f"{e.periodo.desde.isoformat()} a {e.periodo.hasta.isoformat()}"
    libro.properties.subject = f"Periodo: {periodo}"
    negritas = Font(bold=True)

    for posicion, (titulo, columnas, filas) in enumerate(tablas(e)):
        # Los nombres de hoja de Excel admiten 31 caracteres como máximo.
        hoja = libro.create_sheet(titulo[:31])
        renglones: list[list] = []
        if posicion == 0:
            # La primera hoja repite el periodo para que el archivo se entienda solo.
            renglones += [["Periodo", periodo], []]
        encabezado = len(renglones) + 1
        renglones += [columnas, *filas]
        for renglon in renglones:
            hoja.append([_celda(v) for v in renglon])
        for celda in hoja[encabezado]:
            celda.font = negritas
        if posicion == 0:
            hoja["A1"].font = negritas
        for celdas in hoja.iter_rows():
            for celda in celdas:
                if isinstance(celda.value, str):
                    celda.data_type = "s"
        hoja.column_dimensions["A"].width = 40
        for letra in "BC":
            hoja.column_dimensions[letra].width = 26

    salida = io.BytesIO()
    libro.save(salida)
    return salida.getvalue()
