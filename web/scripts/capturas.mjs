// Genera las capturas del panel en docs/capturas/web/ (1440 × 900), con el API simulado y datos de demostración.
// Uso: npm run capturas   (opcional: BASE_URL, CHROMIUM_PATH, SOLO=texto para regenerar solo algunas)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, abrirNavegador, contextoConSesion, iniciarPanel, RAIZ } from './lib/panel.mjs';

const DESTINO = join(RAIZ, 'docs', 'capturas', 'web');
const solo = (process.env.SOLO || '').toLowerCase();
const VISTA = { ancho: 1440, alto: 900 };

/** [archivo, ruta, opciones]. `modal`: texto del botón que abre la ventana; `oscuro`: tema oscuro. */
const CAPTURAS = [
    ['WEB-01_Inicio_de_sesion', '/login', { sinSesion: true }],
    ['WEB-02_Dashboard', '/dashboard'],
    ['WEB-03_Usuarios', '/usuarios'],
    ['WEB-03_Detalle_usuario', '/usuarios/3'],
    ['WEB-04_Empresas', '/empresas'],
    ['WEB-04_Revision_empresa', '/empresas/4'],
    ['WEB-04_Suspender_empresa', '/empresas/1', { modal: 'Suspender' }],
    ['WEB-05_Vacantes', '/vacantes'],
    ['WEB-05_Detalle_vacante', '/vacantes/1'],
    ['WEB-06_Categorias_y_habilidades', '/habilidades'],
    ['WEB-07_Catalogos', '/catalogos'],
    ['WEB-08_Reportes', '/reportes'],
    ['WEB-08_Detalle_reporte', '/reportes/1'],
    ['WEB-08_Resolver_reporte', '/reportes/101', { modal: 'Resolver' }],
    ['WEB-02_Dashboard_oscuro', '/dashboard', { oscuro: true }],
    ['WEB-04_Revision_empresa_oscuro', '/empresas/4', { oscuro: true }],
    ['WEB-08_Detalle_reporte_oscuro', '/reportes/1', { oscuro: true }],
];

mkdirSync(DESTINO, { recursive: true });
const panel = await iniciarPanel();
const navegador = await abrirNavegador();
let hechas = 0;

try {
    for (const oscuro of [false, true]) {
        const { contexto, pagina } = await contextoConSesion(navegador, panel.base, { oscuro, ancho: VISTA.ancho, alto: VISTA.alto });
        const sinSesion = await navegador.newContext({ viewport: { width: VISTA.ancho, height: VISTA.alto }, locale: 'es-MX' });
        const paginaLogin = await sinSesion.newPage();

        for (const [archivo, ruta, opciones = {}] of CAPTURAS) {
            if (Boolean(opciones.oscuro) !== oscuro) continue;
            if (solo && !archivo.toLowerCase().includes(solo)) continue;
            const destino = join(DESTINO, `${archivo}.png`);

            if (opciones.sinSesion) {
                await paginaLogin.goto(`${panel.base}${ruta}`, { waitUntil: 'networkidle' });
                await paginaLogin.screenshot({ path: destino });
            } else {
                await abrir(pagina, panel.base, ruta);
                if (opciones.modal) {
                    await pagina.locator('[aria-haspopup="dialog"]:visible').filter({ hasText: new RegExp(`^\\s*${opciones.modal}`) }).first().click();
                    await pagina.waitForSelector('[role=dialog]:visible');
                    await pagina.waitForTimeout(600);
                }
                // Las ventanas se capturan en la vista; las páginas, completas a 1440 px de ancho.
                await pagina.screenshot({ path: destino, fullPage: !opciones.modal });
            }
            hechas++;
            console.log(`✓ ${archivo}.png`);
        }
        await sinSesion.close();
        await contexto.close();
    }
} finally {
    await navegador.close();
    await panel.detener();
}

console.log(`\n${hechas} capturas en docs/capturas/web/`);
