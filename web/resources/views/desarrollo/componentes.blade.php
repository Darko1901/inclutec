@extends('layouts.admin_layout')
@section('titulo', 'Componentes')
@section('content')
<x-encabezado-pagina titulo="Componentes del panel" descripcion="Guía viva para armar pantallas. Solo se muestra con APP_ENV=local.">
    <x-boton variante="secundario" :href="route('componentes')">Restablecer ejemplos</x-boton>
</x-encabezado-pagina>

<section class="componentes-seccion" aria-labelledby="c-botones">
    <h2 id="c-botones">Botones</h2>
    <div class="componentes-fila">
        <x-boton>Primario</x-boton>
        <x-boton variante="secundario">Secundario</x-boton>
        <x-boton variante="peligro">Peligro</x-boton>
        <x-boton variante="texto">Texto</x-boton>
        <x-boton :deshabilitado="true">Deshabilitado</x-boton>
        <x-boton variante="secundario" :href="route('dashboard')">Enlace con aspecto de botón</x-boton>
    </div>
</section>

<section class="componentes-seccion" aria-labelledby="c-estados">
    <h2 id="c-estados">Insignias de estado</h2>
    <p style="margin-bottom: 1rem;">Mapa único en <code>App\Support\Estados</code> (tabla 3.4 de pantallas.md): el API manda el valor de BD y el panel pone texto, ícono y color. Nunca solo color.</p>
    @foreach ($estados as $entidad => $valores)
        <h3 style="font-size: 1rem; margin: 1rem 0 0.5rem;">{{ ucfirst($entidad) }}</h3>
        <div class="componentes-fila">
            @foreach ($valores as $valor => $estado)
                <x-insignia-estado :entidad="$entidad" :valor="$valor" />
            @endforeach
        </div>
    @endforeach
</section>

<section class="componentes-seccion" aria-labelledby="c-tabla">
    <h2 id="c-tabla">Tabla y paginación</h2>
    <x-tabla caption="Usuarios de ejemplo" :columnas="['Nombre', 'Correo', 'Estado']">
        @foreach ($usuarios as $usuario)
            <tr>
                <td style="font-weight: 600;">{{ $usuario['nombre'] }}</td>
                <td>{{ $usuario['correo'] }}</td>
                <td><x-insignia-estado entidad="usuario" :valor="$usuario['estado']" /></td>
            </tr>
        @endforeach
    </x-tabla>
    <x-paginacion :total="120" :page="$pagina" :size="25" />

    <h3 style="font-size: 1rem; margin: 1.5rem 0 0.5rem;">Estado vacío</h3>
    <x-tabla caption="Tabla sin datos" :columnas="['Nombre', 'Correo', 'Estado']" mensajeVacio="No se encontraron usuarios." />
</section>

<section class="componentes-seccion" aria-labelledby="c-filtros">
    <h2 id="c-filtros">Filtros</h2>
    <x-filtros buscar="Buscar por nombre o correo" placeholderBusqueda="Nombre o correo"
               :selects="[['nombre' => 'estado', 'etiqueta' => 'Estado', 'opciones' => $opcionesEstado, 'todas' => 'Todos']]"
               :total="$usuarios->count()" />
</section>

<section class="componentes-seccion" aria-labelledby="c-campos">
    <h2 id="c-campos">Campos de formulario</h2>
    <div class="card" style="max-width: 560px;">
        <form x-data @submit.prevent novalidate>
            <x-campo nombre="nombre" etiqueta="Nombre" obligatorio ayuda="Como aparece en su identificación." maximo="80" valor="Laura" />
            <x-campo nombre="correo" etiqueta="Correo electrónico" tipo="email" obligatorio autocomplete="off" />
            <x-campo nombre="modalidad" etiqueta="Modalidad" tipo="select" :opciones="$modalidades" vacio="Selecciona una opción" />
            <x-campo nombre="descripcion" etiqueta="Descripción" tipo="textarea" maximo="255"
                     error="Escribe una descripción de al menos 20 caracteres." />
            <x-campo nombre="clave" etiqueta="Contraseña" tipo="password" ayuda="De 8 a 64 caracteres, con al menos una letra y un número." />
            <x-boton tipo="submit">Guardar (ejemplo)</x-boton>
        </form>
    </div>
</section>

<section class="componentes-seccion" aria-labelledby="c-errores">
    <h2 id="c-errores">Resumen de errores</h2>
    <div x-data="{ mostrar: false }">
        <x-boton variante="secundario" @click="mostrar = !mostrar">Mostrar u ocultar el resumen de errores</x-boton>
        <div style="margin-top: 1rem;">
            <template x-if="mostrar">
                <div>
                    <x-resumen-errores :errores="['nombre' => 'Escribe el nombre.', 'correo' => 'Escribe un correo válido, por ejemplo nombre@dominio.mx.']" />
                </div>
            </template>
        </div>
    </div>
</section>

<section class="componentes-seccion" aria-labelledby="c-modales"
         x-data @confirmado.window="$dispatch('notify', { msg: 'Motivo registrado: ' + $event.detail.motivo, type: 'success' })">
    <h2 id="c-modales">Ventanas, confirmaciones y avisos</h2>
    <div class="componentes-fila">
        <x-boton @click="$dispatch('abrir-modal', 'ejemplo')">Abrir ventana</x-boton>
        <x-boton variante="peligro" @click="$dispatch('abrir-modal', 'suspender')">Suspender con motivo</x-boton>
        <x-boton variante="secundario" @click="$dispatch('notify', { msg: 'Los cambios se guardaron.', type: 'success' })">Aviso de éxito</x-boton>
        <x-boton variante="secundario" @click="$dispatch('notify', { msg: 'No se pudo guardar. Inténtalo de nuevo.', type: 'error' })">Aviso de error</x-boton>
    </div>

    <x-modal id="ejemplo" titulo="Ejemplo de ventana">
        <p>El foco queda dentro de la ventana, Escape la cierra y el foco regresa al botón que la abrió.</p>
        <x-slot:pie>
            <x-boton variante="secundario" @click="$dispatch('cerrar-modal', 'ejemplo')">Cerrar</x-boton>
        </x-slot:pie>
    </x-modal>

    <x-confirmacion id="suspender" titulo="¿Suspender a Laura Hernández Ruiz?" mensaje="No podrá iniciar sesión hasta que la reactives."
                    textoConfirmar="Suspender" pedirMotivo etiquetaMotivo="Motivo de la suspensión" />
</section>
@endsection
