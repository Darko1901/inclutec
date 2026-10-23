// Corre axe-core en todas las páginas del panel, en claro y oscuro, también con cada ventana abierta.
// Uso: npm run verificar:axe   (opcional: BASE_URL=http://localhost:8001, SOLO=texto para filtrar páginas)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { abrir, abrirNavegador, contextoConSesion, iniciarPanel, PAGINAS, CORREO } from './lib/panel.mjs';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const solo = (process.env.SOLO || '').toLowerCase();

let paginasAuditadas = 0;
const hallazgos = [];

async function auditar(pagina, tema, nombre) {
    await pagina.evaluate(axeSource);
    const resultado = await pagina.evaluate((etiquetas) => axe.run(document, { runOnly: { type: 'tag', values: etiquetas } }), ETIQUETAS);
    paginasAuditadas++;
    for (const v of resultado.violations) {
        hallazgos.push({ tema, nombre, regla: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) });
    }
    console.log(`  ${resultado.violations.length === 0 ? '✓' : '✗'} [${tema}] ${nombre}${resultado.violations.length ? ` — ${resultado.violations.length} hallazgo(s)` : ''}`);
}

/**
 * Abre cada ventana distinta de la página (por el texto de su botón) y la audita; después la envía vacía para
 * auditar también los errores visibles dentro de la ventana. Cada ventana parte de la página recién cargada.
 */
async function auditarVentanas(pagina, tema, nombre, base, ruta) {
    const claves = await pagina.$$eval('[aria-haspopup="dialog"]', (botones) => {
        const vistos = new Set();
        for (const boton of botones) {
            const clave = (boton.innerText.trim().split(/\s+/)[0] || '').toLowerCase();
            if (boton.offsetParent && clave) vistos.add(clave);
        }

        return [...vistos].slice(0, 6);
    });

    for (const clave of claves) {
        await abrir(pagina, base, ruta);
        const boton = pagina.locator('[aria-haspopup="dialog"]:visible').filter({ hasText: new RegExp(`^\\s*${clave}`, 'i') }).first();
        await boton.click();
        await pagina.waitForSelector('[role=dialog]:visible', { timeout: 3000 });
        await pagina.waitForTimeout(600);
        await auditar(pagina, tema, `${nombre} · ventana «${clave}»`);

        // Con errores visibles: confirmar sin escribir lo que se pide muestra el aviso dentro de la ventana
        // (en el navegador o, en los formularios de catálogo, con la respuesta del servidor).
        const confirmar = pagina.locator('[role=dialog]:visible button[type=submit]').first();
        if (await pagina.locator('[role=dialog]:visible [required]').count()) {
            await confirmar.click();
            await pagina.waitForTimeout(1500);
            if (await pagina.locator('[role=dialog]:visible .form-error:visible').count()) {
                await auditar(pagina, tema, `${nombre} · ventana «${clave}» con errores`);
            }
        }
    }
}

const panel = await iniciarPanel();
const navegador = await abrirNavegador();
try {
    for (const oscuro of [false, true]) {
        const tema = oscuro ? 'oscuro' : 'claro';
        console.log(`\n== Tema ${tema} ==`);

        // Sin sesión: inicio de sesión (vacío, con errores) y una dirección que no existe.
        const anonimo = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-MX' });
        await anonimo.addInitScript((v) => localStorage.setItem('darkMode', v), oscuro ? 'true' : 'false');
        const p0 = await anonimo.newPage();
        if (!solo || 'inicio de sesión'.includes(solo)) {
            await abrir(p0, panel.base, '/login');
            await auditar(p0, tema, 'Inicio de sesión');
            await p0.fill('#correo', 'no-es-correo');
            await p0.click('button[type=submit]', { force: true });
            await p0.waitForTimeout(500);
            await p0.evaluate(() => document.querySelector('form').requestSubmit());
            await p0.waitForLoadState('networkidle');
            await p0.waitForTimeout(1000);
            await auditar(p0, tema, 'Inicio de sesión con errores');
            await abrir(p0, panel.base, '/no-existe');
            await auditar(p0, tema, '404 sin sesión');
        }
        await anonimo.close();

        const { contexto, pagina } = await contextoConSesion(navegador, panel.base, { oscuro });
        for (const [nombre, ruta] of PAGINAS) {
            if (solo && !nombre.toLowerCase().includes(solo)) continue;
            await abrir(pagina, panel.base, ruta);
            await auditar(pagina, tema, nombre);
            // Las gráficas del dashboard: con todas las tablas abiertas.
            if (ruta.startsWith('/dashboard') && (await pagina.locator('.grafica-boton:visible').count())) {
                for (const boton of await pagina.locator('.grafica-boton:visible').all()) await boton.click();
                await pagina.waitForTimeout(400);
                await auditar(pagina, tema, `${nombre} · con las tablas de las gráficas abiertas`);
            }
            await auditarVentanas(pagina, tema, nombre, panel.base, ruta);
        }

        // Formularios con errores visibles (se envían vacíos o con datos que el servidor rechaza).
        if (!solo) {
            await abrir(pagina, panel.base, '/usuarios/nuevo');
            await pagina.selectOption('#rol', 'reclutador');
            await pagina.fill('#correo', CORREO);
            await pagina.click('.formulario-usuario button[type=submit]');
            await pagina.waitForLoadState('networkidle');
            await pagina.waitForTimeout(1000);
            await auditar(pagina, tema, 'Usuario nuevo con errores');

            await abrir(pagina, panel.base, '/empresas/nueva');
            await pagina.fill('#rfc', 'ETR2101119P4');
            await pagina.click('.formulario-usuario button[type=submit]');
            await pagina.waitForLoadState('networkidle');
            await pagina.waitForTimeout(1000);
            await auditar(pagina, tema, 'Empresa nueva con errores');

            await abrir(pagina, panel.base, '/perfil');
            await pagina.fill('#contrasena_actual', 'Equivocada99');
            await pagina.fill('#contrasena_nueva', 'NuevaClave2026');
            await pagina.fill('#contrasena_nueva_confirmation', 'NuevaClave2026');
            await pagina.click('form[action$="/perfil"] button[type=submit]');
            await pagina.waitForLoadState('networkidle');
            await pagina.waitForTimeout(1000);
            await auditar(pagina, tema, 'Cambiar contraseña con errores');
        }
        await contexto.close();
    }
} finally {
    await navegador.close();
    await panel.detener();
}

console.log(`\n${paginasAuditadas} páginas y ventanas auditadas con axe-core (${ETIQUETAS.join(', ')}).`);
if (hallazgos.length === 0) {
    console.log('0 hallazgos.');
} else {
    console.log(`${hallazgos.length} hallazgo(s):`);
    for (const h of hallazgos) console.log(`- [${h.tema}] ${h.nombre}: ${h.regla} (${h.impacto}) ${h.ayuda}\n    ${h.nodos.join('\n    ')}`);
    process.exitCode = 1;
}
