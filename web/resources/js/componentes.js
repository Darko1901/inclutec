import Alpine from 'alpinejs';

/**
 * Avisos del panel. Los éxitos van a una región `role="status"` y los errores a una `role="alert"`
 * (ambas existen desde que carga la página, así el lector de pantalla anuncia lo que se agrega).
 * Los mensajes flash de sesión llegan en `iniciales`; las pantallas con datos fijos usan el evento
 * `notify` ({ msg, type }).
 */
Alpine.data('avisos', (iniciales = []) => ({
    lista: [],
    siguiente: 1,

    init() {
        iniciales.forEach((aviso) => this.agregar(aviso.mensaje, aviso.tipo));
    },

    agregar(mensaje, tipo = 'exito') {
        const id = this.siguiente++;
        this.lista.push({ id, mensaje, tipo });
        // Los éxitos se quitan solos; los errores se quedan hasta que se cierran.
        if (tipo !== 'error') setTimeout(() => this.quitar(id), 8000);
    },

    quitar(id) {
        this.lista = this.lista.filter((aviso) => aviso.id !== id);
    },

    de(tipo) {
        return this.lista.filter((aviso) => (tipo === 'error') === (aviso.tipo === 'error'));
    },
}));

/**
 * Modal accesible. Se abre con el evento `abrir-modal` (detail = id) y se cierra con Escape, con
 * su botón «Cerrar» o con `cerrar-modal`. El foco queda atrapado dentro (plugin focus, x-trap en
 * la vista) y regresa al elemento que lo abrió.
 */
Alpine.data('modal', (id, abierto = false) => ({
    id,
    abierto,
    origen: null,

    abrir() {
        this.origen = document.activeElement;
        this.abierto = true;
    },

    cerrar() {
        if (!this.abierto) return;
        this.abierto = false;
        const origen = this.origen;
        this.$nextTick(() => {
            if (origen && document.contains(origen)) origen.focus();
        });
    },
}));

/**
 * Cuerpo del modal de confirmación. Si pide motivo, no deja confirmar sin escribirlo y lleva el
 * foco al campo con su mensaje de error. Sin `accion`, en lugar de enviar el formulario avisa con
 * el evento `confirmado` ({ id, motivo }).
 */
Alpine.data('confirmacion', ({ id, pideMotivo, envia, motivo = '', error = '', mensajeVacio = 'Escribe el motivo para continuar.' }) => ({
    motivo,
    error,

    enviar(evento) {
        if (pideMotivo && this.motivo.trim() === '') {
            evento.preventDefault();
            this.error = mensajeVacio;
            this.$nextTick(() => this.$refs.motivo.focus());
            return;
        }
        this.error = '';
        if (!envia) {
            evento.preventDefault();
            window.dispatchEvent(new CustomEvent('confirmado', { detail: { id, motivo: this.motivo.trim() } }));
            this.motivo = '';
            window.dispatchEvent(new CustomEvent('cerrar-modal', { detail: id }));
        }
    },
}));

/** Contador de caracteres de un campo con límite. */
Alpine.data('contador', (inicial = 0) => ({ cantidad: inicial }));

/** Texto para el lector de pantalla con el número de resultados de una búsqueda. */
Alpine.data('resultados', (texto) => ({
    anuncio: '',
    init() {
        // Se escribe después de cargar para que la región `aria-live` lo anuncie.
        setTimeout(() => (this.anuncio = texto), 400);
    },
}));
