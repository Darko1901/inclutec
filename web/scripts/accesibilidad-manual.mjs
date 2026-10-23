// Comprobaciones de accesibilidad que axe no hace (WCAG 2.1 AA), en todas las páginas del panel:
//   1. Reflujo (1.4.10): a 320 px de ancho y a 200 % de zoom no hay desplazamiento horizontal fuera de las tablas.
//   2. Menú lateral: se abre y se cierra con el teclado y regresa el foco.
//   3. Movimiento reducido: con prefers-reduced-motion no hay transiciones ni animaciones.
//   4. Título propio («Pantalla · IncluTec Admin»), un solo <h1> y encabezados en orden.
//   5. Foco visible en todo lo interactivo, en claro y oscuro (2.4.7).
//   6. Nombre accesible de cada control, a partir del árbol de accesibilidad (lo que lee un lector de pantalla).
// Uso: npm run verificar:manual   (opcional: BASE_URL, ARBOL=ruta/carpeta para guardar el árbol de cada página)
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrir, abrirNavegador, contextoConSesion, iniciarPanel, PAGINAS } from './lib/panel.mjs';

const problemas = [];
const registrar = (comprobacion, pagina, detalle) => problemas.push({ comprobacion, pagina, detalle });
const rutas = PAGINAS.filter(([, ruta]) => !ruta.startsWith('/componentes') || ruta.includes('error'));

const panel = await iniciarPanel();
const navegador = await abrirNavegador();
try {
    // 1. Reflujo a 320 px y a 200 % de zoom (1280 px a 200 % = 640 px de ancho).
    for (const ancho of [320, 640]) {
        const { contexto, pagina } = await contextoConSesion(navegador, panel.base, { ancho, alto: 800 });
        for (const [nombre, ruta] of rutas) {
            await abrir(pagina, panel.base, ruta);
            const exceso = await pagina.evaluate(() => {
                const margen = document.documentElement.clientWidth + 1;
                const dentroDeDesplazable = (el) => !!el.closest('.table-wrapper, .linea-contenedor');
                const culpables = [...document.querySelectorAll('body *')]
                    .filter((el) => !dentroDeDesplazable(el) && getComputedStyle(el).position !== 'fixed' && el.getBoundingClientRect().right > margen && el.getBoundingClientRect().width > 0 && el.offsetParent !== null)
                    .slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));

                return { ancho: document.documentElement.scrollWidth, cliente: document.documentElement.clientWidth, culpables };
            });
            if (exceso.ancho > exceso.cliente + 1) registrar(`reflujo a ${ancho} px`, nombre, `la página mide ${exceso.ancho} px de ancho para ${exceso.cliente} px: ${exceso.culpables.join(', ')}`);
        }
        console.log(`✓ Reflujo a ${ancho} px revisado en ${rutas.length} páginas.`);

        // 2. Menú lateral con el teclado (solo cuando está plegado, a 320 px).
        if (ancho === 320) {
            await abrir(pagina, panel.base, '/dashboard');
            const botonMenu = pagina.getByRole('button', { name: 'Abrir menú principal' });
            await botonMenu.focus();
            await pagina.keyboard.press('Enter');
            await pagina.waitForTimeout(500);
            const abierto = await botonMenu.getAttribute('aria-expanded');
            const focoDentro = await pagina.evaluate(() => !!document.activeElement.closest('#menu-lateral'));
            if (abierto !== 'true') registrar('menú lateral', 'Dashboard', 'Enter no abre el menú (aria-expanded no es true)');
            if (!focoDentro) registrar('menú lateral', 'Dashboard', 'al abrir el menú el foco no pasa a su interior');
            await pagina.keyboard.press('Tab');
            const sigueDentro = await pagina.evaluate(() => !!document.activeElement.closest('#menu-lateral'));
            if (!sigueDentro) registrar('menú lateral', 'Dashboard', 'Tab saca el foco del menú abierto (debería quedar atrapado)');
            await pagina.keyboard.press('Escape');
            await pagina.waitForTimeout(500);
            const cerrado = await botonMenu.getAttribute('aria-expanded');
            const foco = await pagina.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.innerText);
            if (cerrado !== 'false') registrar('menú lateral', 'Dashboard', 'Escape no cierra el menú');
            if (!/Abrir menú principal/.test(foco)) registrar('menú lateral', 'Dashboard', `al cerrar el menú el foco no vuelve a su botón (está en «${foco}»)`);
            // Y con el botón «Cerrar menú principal».
            await botonMenu.focus();
            await pagina.keyboard.press('Space');
            await pagina.waitForTimeout(500);
            await pagina.getByRole('button', { name: 'Cerrar menú principal' }).focus();
            await pagina.keyboard.press('Enter');
            await pagina.waitForTimeout(500);
            if ((await botonMenu.getAttribute('aria-expanded')) !== 'false') registrar('menú lateral', 'Dashboard', '«Cerrar menú principal» no cierra el menú');
            console.log('✓ Menú lateral: se abre con Enter o Espacio y se cierra con Escape o con su botón, con el foco atrapado y devuelto.');
        }
        await contexto.close();
    }

    // 3. Movimiento reducido.
    {
        const { contexto, pagina } = await contextoConSesion(navegador, panel.base, { movimientoReducido: true });
        for (const [nombre, ruta] of rutas) {
            await abrir(pagina, panel.base, ruta);
            const conMovimiento = await pagina.evaluate(() => [...document.querySelectorAll('*')]
                .filter((el) => { const c = getComputedStyle(el); const dur = (v) => v.split(',').some((x) => parseFloat(x) > 0.001); return (c.transitionProperty !== 'none' && dur(c.transitionDuration)) || (c.animationName !== 'none' && dur(c.animationDuration)) || c.scrollBehavior === 'smooth'; })
                .slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60)));
            if (conMovimiento.length) registrar('movimiento reducido', nombre, `siguen con movimiento: ${conMovimiento.join(', ')}`);
        }
        console.log(`✓ Movimiento reducido revisado en ${rutas.length} páginas.`);
        await contexto.close();
    }

    // 4 a 6. Título, encabezados, foco visible y nombres accesibles, en claro y oscuro.
    const titulos = new Map();
    for (const oscuro of [false, true]) {
        const tema = oscuro ? 'oscuro' : 'claro';
        const { contexto, pagina } = await contextoConSesion(navegador, panel.base, { oscuro });
        for (const [nombre, ruta] of rutas) {
            await abrir(pagina, panel.base, ruta);

            const datos = await pagina.evaluate(() => ({
                titulo: document.title,
                h1: document.querySelectorAll('h1').length,
                niveles: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((h) => h.offsetParent !== null || h.closest('[x-cloak]') === null).map((h) => Number(h.tagName[1])),
            }));
            if (!oscuro) {
                if (!/^.+ · IncluTec Admin$/.test(datos.titulo)) registrar('título', nombre, `«${datos.titulo}» no tiene el formato «Pantalla · IncluTec Admin»`);
                if (datos.h1 !== 1) registrar('encabezados', nombre, `hay ${datos.h1} <h1> (debe haber uno)`);
                for (let i = 1; i < datos.niveles.length; i++) {
                    if (datos.niveles[i] - datos.niveles[i - 1] > 1) registrar('encabezados', nombre, `salta de h${datos.niveles[i - 1]} a h${datos.niveles[i]}`);
                }
                if (datos.niveles[0] !== 1) registrar('encabezados', nombre, `el primer encabezado es h${datos.niveles[0]}, no h1`);
                titulos.set(datos.titulo, [...(titulos.get(datos.titulo) || []), nombre]);
            }

            // Foco visible: se recorre con Tab y cada elemento enfocado debe mostrar un contorno de 2 px o más.
            let sinFoco = [];
            // Un campo de fecha tiene varias paradas internas (día, mes, año y el calendario); solo cuenta la primera.
            const yaVistos = new Set();
            for (let i = 0; i < 70; i++) {
                await pagina.keyboard.press('Tab');
                const estado = await pagina.evaluate(() => {
                    const el = document.activeElement;
                    if (!el || el === document.body) return null;
                    const c = getComputedStyle(el);

                    return { visible: el.matches(':focus-visible') && c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2, nombre: `${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''} «${(el.getAttribute('aria-label') || el.innerText || el.value || '').trim().slice(0, 30)}»`, vuelta: el.matches('a.saltar-contenido') };
                });
                if (estado === null) break;
                if (i > 0 && estado.vuelta) break;
                if (yaVistos.has(estado.nombre)) continue;
                yaVistos.add(estado.nombre);
                if (!estado.visible) sinFoco.push(estado.nombre);
            }
            if (sinFoco.length) registrar(`foco visible (${tema})`, nombre, [...new Set(sinFoco)].slice(0, 4).join('; '));

            // Árbol de accesibilidad: cada botón, enlace o campo debe tener nombre.
            const arbol = await pagina.locator('body').ariaSnapshot();
            if (process.env.ARBOL && !oscuro) {
                mkdirSync(process.env.ARBOL, { recursive: true });
                writeFileSync(`${process.env.ARBOL}/${nombre.replace(/\W+/g, '_')}.yml`, arbol);
            }
            const sinNombre = arbol.split('\n').filter((l) => /^\s*- (button|link|textbox|combobox|checkbox|radio|searchbox|spinbutton)(\s*\[[^\]]*\])*:?\s*$/.test(l) || /^\s*- (button|link|textbox|combobox|checkbox|searchbox) ""/.test(l));
            if (sinNombre.length) registrar(`nombre accesible (${tema})`, nombre, sinNombre.slice(0, 3).map((l) => l.trim()).join('; '));
        }
        console.log(`✓ Título, encabezados, foco visible y nombres accesibles revisados en ${rutas.length} páginas (${tema}).`);
        await contexto.close();
    }
    for (const [titulo, paginas] of titulos) {
        // Las variantes de una misma pantalla (el mismo primer segmento de la ruta) comparten título; dos pantallas distintas no.
        const pantallas = new Set(paginas.map((p) => new URL(rutas.find(([nombre]) => nombre === p)[1], 'http://x').pathname.split('/')[1]));
        if (pantallas.size > 1 && !/Error|404|permiso/i.test(paginas.join())) registrar('título repetido', paginas.join(', '), `«${titulo}»`);
    }
} finally {
    await navegador.close();
    await panel.detener();
}

if (problemas.length === 0) {
    console.log('\n0 hallazgos.');
} else {
    console.log(`\n${problemas.length} hallazgo(s):`);
    for (const p of problemas) console.log(`- ${p.comprobacion} · ${p.pagina}: ${p.detalle}`);
    process.exitCode = 1;
}
