// Utilidades compartidas por los scripts de verificación del panel (solo desarrollo).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

export const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
export const CORREO = 'admin@inclutec.mx';
export const CONTRASENA = 'Inclutec2026';

/**
 * Páginas del panel con sesión: [nombre, ruta]. Con datos del mock recién reiniciado:
 * el reporte 1 está abierto, el 101 en revisión, el 104 resuelto; la empresa 4 (Estudio Trazo)
 * está pendiente y la 102 tiene un RFC con formato inválido; la vacante 203 está suspendida.
 */
export const PAGINAS = [
    ['Dashboard', '/dashboard'],
    ['Dashboard 90 días', '/dashboard?periodo=90'],
    ['Dashboard con periodo no válido', '/dashboard?periodo=personalizado&desde=2026-09-10&hasta=2026-09-01'],
    ['Usuarios', '/usuarios'],
    ['Usuarios filtrados', '/usuarios?q=a&rol=candidato&estado=activo'],
    ['Usuarios página 3', '/usuarios?page=3'],
    ['Usuario detalle candidato', '/usuarios/3'],
    ['Usuario detalle reclutador', '/usuarios/2'],
    ['Usuario nuevo', '/usuarios/nuevo'],
    ['Usuario editar', '/usuarios/2/editar'],
    ['Empresas pendientes', '/empresas'],
    ['Empresas validadas', '/empresas?estado=validada'],
    ['Empresa revisión pendiente', '/empresas/4'],
    ['Empresa revisión RFC inválido', '/empresas/102'],
    ['Empresa revisión validada', '/empresas/1'],
    ['Empresa nueva', '/empresas/nueva'],
    ['Empresa editar', '/empresas/1/editar'],
    ['Vacantes', '/vacantes'],
    ['Vacantes con reportes', '/vacantes?con_reportes=1'],
    ['Vacante detalle', '/vacantes/1'],
    ['Vacante sin condiciones', '/vacantes/5'],
    ['Vacante suspendida', '/vacantes/203'],
    ['Reportes abiertos', '/reportes'],
    ['Reportes resueltos', '/reportes?estado=resuelto'],
    ['Reporte abierto', '/reportes/1'],
    ['Reporte en revisión', '/reportes/101'],
    ['Reporte resuelto', '/reportes/104'],
    ['Categorías', '/habilidades'],
    ['Habilidades', '/habilidades?seccion=habilidades'],
    ['Catálogo de ajustes', '/catalogos'],
    ['Catálogo de niveles educativos', '/catalogos?tipo=niveles-educativos'],
    ['Catálogo de tamaños de empresa', '/catalogos?tipo=tamanos-empresa'],
    ['Catálogo de motivos de reporte', '/catalogos?tipo=motivos-reporte'],
    ['Cambiar contraseña', '/perfil'],
    ['404 con sesión', '/usuarios/9999'],
    ['Error del API', '/componentes/error/api'],
    ['Sin permiso', '/componentes/error/permiso'],
    ['404 de un detalle', '/componentes/error/fuera'],
    ['Guía de componentes', '/componentes'],
];

/** Chromium de Playwright, o el que indiques con CHROMIUM_PATH (por ejemplo, el del sistema). */
export function abrirNavegador() {
    return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

async function responde(base) {
    try {
        return (await fetch(`${base}/login`, { redirect: 'manual' })).status < 500;
    } catch {
        return false;
    }
}

/**
 * Usa el panel que ya corre en BASE_URL (por omisión http://localhost:8001); si no hay ninguno, arranca
 * `php artisan serve` con el API simulado y un archivo de datos propio (no toca tus datos de desarrollo).
 */
export async function iniciarPanel() {
    const base = (process.env.BASE_URL || 'http://localhost:8001').replace(/\/$/, '');
    if (await responde(base)) {
        console.log(`Usando el panel que ya corre en ${base}. Reinicia el API simulado antes (php artisan inclutec:mock-reiniciar) para repetir los mismos datos.`);

        return { base, detener: async () => {} };
    }

    const puerto = new URL(base).port || '8001';
    const env = { ...process.env, APP_ENV: 'local', INCLUTEC_API_MOCK: 'true', INCLUTEC_MOCK_ARCHIVO: join(tmpdir(), `inclutec-verificacion-${process.pid}.json`) };
    const servidor = spawn('php', ['artisan', 'serve', `--port=${puerto}`], { cwd: RAIZ, env, stdio: 'ignore' });
    for (let intento = 0; intento < 60 && !(await responde(base)); intento++) {
        await new Promise((r) => setTimeout(r, 500));
    }
    if (!(await responde(base))) {
        servidor.kill();
        throw new Error(`No se pudo arrancar el panel en ${base}. Corre "npm run build" y "php artisan serve --port=${puerto}" y vuelve a intentar.`);
    }
    console.log(`Panel iniciado en ${base} con el API simulado (datos propios de esta corrida).`);

    return { base, detener: async () => { servidor.kill(); } };
}

/** Un contexto del navegador, en claro u oscuro, ya con la sesión del administrador. */
export async function contextoConSesion(navegador, base, { oscuro = false, ancho = 1280, alto = 900, movimientoReducido = false } = {}) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: movimientoReducido ? 'reduce' : 'no-preference', locale: 'es-MX' });
    await contexto.addInitScript((valor) => localStorage.setItem('darkMode', valor), oscuro ? 'true' : 'false');
    const pagina = await contexto.newPage();
    await pagina.goto(`${base}/login`);
    await pagina.fill('#correo', CORREO);
    await pagina.fill('#contrasena', CONTRASENA);
    await Promise.all([pagina.waitForURL('**/dashboard'), pagina.click('button[type=submit]')]);

    return { contexto, pagina };
}

export async function abrir(pagina, base, ruta) {
    await pagina.goto(`${base}${ruta}`, { waitUntil: 'networkidle' });
    // Las transiciones de color del tema tardan ~1 s; se espera para medir el color final.
    await pagina.waitForTimeout(1000);
}
