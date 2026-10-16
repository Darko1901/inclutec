@php
    use App\Support\Iconos;

    // Menú principal: nombre de la ruta, texto del diseño (docs/diseno/pantallas.md) e ícono.
    $menu = [
        ['ruta' => 'dashboard', 'texto' => 'Dashboard', 'icono' => 'panel'],
        ['ruta' => 'usuarios', 'texto' => 'Usuarios', 'icono' => 'usuarios'],
        ['ruta' => 'empresas', 'texto' => 'Empresas', 'icono' => 'empresa'],
        ['ruta' => 'vacantes', 'texto' => 'Vacantes', 'icono' => 'maletin'],
        ['ruta' => 'habilidades', 'texto' => 'Categorías y habilidades', 'icono' => 'sello'],
        ['ruta' => 'catalogos', 'texto' => 'Catálogos', 'icono' => 'lista'],
        ['ruta' => 'reportes', 'texto' => 'Reportes', 'icono' => 'alerta'],
    ];

    // Datos del administrador (los comparte el middleware `admin` tras validar el token).
    $nombreAdmin = $administrador['nombre'] ?? 'Administrador';
    $iniciales = mb_strtoupper(mb_substr($administrador['nombre'] ?? 'A', 0, 1).mb_substr($administrador['apellidos'] ?? '', 0, 1));

    // Mensajes flash de sesión: `exito` va a la región de estado y `error` a la de alerta.
    $avisosIniciales = array_values(array_filter([
        session('exito') ? ['mensaje' => session('exito'), 'tipo' => 'exito'] : null,
        session('error') ? ['mensaje' => session('error'), 'tipo' => 'error'] : null,
    ]));
@endphp
<!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('titulo', 'Panel') · IncluTec</title>
    <link rel="icon" href="/img/icon.png">
    @vite(['resources/css/admin.css', 'resources/js/app.js'])
</head>
<body x-data="{ darkMode: false, sidebarOpen: false }"
      x-init="darkMode = JSON.parse(localStorage.getItem('darkMode') || 'false'); $watch('darkMode', val => localStorage.setItem('darkMode', val))"
      :class="{'dark': darkMode}"
      @keydown.escape.window="if (sidebarOpen) { sidebarOpen = false; $refs.botonMenu.focus() }">

    <a href="#contenido" class="saltar-contenido">Saltar al contenido</a>

    <div class="admin-layout">
        <div class="sidebar-overlay" :class="{'open': sidebarOpen}" @click="sidebarOpen = false"></div>
        <aside class="sidebar" id="menu-lateral" aria-label="Barra lateral" :class="{'open': sidebarOpen}"
               x-trap.noscroll="sidebarOpen && window.matchMedia('(max-width: 768px)').matches">
            <div class="sidebar-header">
                <button type="button" class="close-sidebar-btn" @click="sidebarOpen = false; $nextTick(() => $refs.botonMenu.focus())" aria-label="Cerrar menú principal">&times;</button>
                <img src="/img/icon.png" alt="" width="40" height="40">
                <span>IncluTec Admin</span>
            </div>
            <nav class="sidebar-nav" aria-label="Menú principal">
                <ul class="sidebar-lista">
                    @foreach ($menu as $elemento)
                        <li>
                            <a href="{{ route($elemento['ruta']) }}" class="sidebar-link"
                               @if (request()->routeIs($elemento['ruta'])) aria-current="page" @endif>
                                {!! Iconos::svg($elemento['icono'], 22) !!}
                                {{ $elemento['texto'] }}
                            </a>
                        </li>
                    @endforeach
                </ul>
            </nav>
        </aside>

        <div class="main-content">
            <header class="topbar">
                <button type="button" class="mobile-menu-btn" x-ref="botonMenu" @click="sidebarOpen = true"
                        aria-expanded="false" :aria-expanded="sidebarOpen.toString()" aria-controls="menu-lateral" aria-label="Abrir menú principal">
                    {!! Iconos::svg('menu', 28) !!}
                </button>
                <div class="topbar-titulo"><span class="visually-hidden">IncluTec: </span>Administración Central</div>
                <div class="topbar-derecha topbar-right">
                    <button type="button" class="boton-icono" @click="darkMode = !darkMode" aria-label="Alternar modo oscuro" aria-pressed="false" :aria-pressed="darkMode.toString()">
                        <span x-show="!darkMode">{!! Iconos::svg('luna', 24) !!}</span>
                        <span x-show="darkMode" x-cloak>{!! Iconos::svg('sol', 24) !!}</span>
                    </button>
                    <div class="menu-usuario" x-data="{ abierto: false }"
                         @keydown.escape="if (abierto) { abierto = false; $refs.boton.focus() }"
                         @click.outside="abierto = false"
                         @focusout="if (abierto && !$el.contains($event.relatedTarget)) abierto = false">
                        <button type="button" class="menu-usuario-boton" x-ref="boton" @click="abierto = !abierto"
                                aria-expanded="false" :aria-expanded="abierto.toString()" aria-controls="menu-usuario">
                            <span class="avatar-iniciales" aria-hidden="true">{{ $iniciales }}</span>
                            <span>{{ $nombreAdmin }}</span>
                            <span class="visually-hidden">Menú de usuario</span>
                            {!! Iconos::svg('chevron-abajo', 16) !!}
                        </button>
                        <div id="menu-usuario" class="profile-dropdown-menu" x-show="abierto" x-cloak>
                            <a href="{{ route('perfil') }}">{!! Iconos::svg('llave', 18) !!} Cambiar contraseña</a>
                            <hr>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit" class="menu-salir">{!! Iconos::svg('salir', 18) !!} Cerrar sesión</button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            <main id="contenido" class="content-body" tabindex="-1">
                {{-- Avisos: las regiones existen desde que carga la página para que el lector de pantalla anuncie lo que se agrega. --}}
                <div class="toast-container" x-data="avisos(@js($avisosIniciales))"
                     @notify.window="agregar($event.detail.msg, $event.detail.type === 'error' ? 'error' : 'exito')">
                    <div class="avisos-zona" role="status" aria-live="polite">
                        <template x-for="aviso in de('exito')" :key="aviso.id">
                            <div class="toast toast-success">
                                <span class="toast-cuerpo">{!! Iconos::svg('check-circulo', 20) !!}<span><span class="visually-hidden">Éxito: </span><span x-text="aviso.mensaje"></span></span></span>
                                <button type="button" class="toast-cerrar" @click="quitar(aviso.id)" aria-label="Cerrar aviso">{!! Iconos::svg('x', 18) !!}</button>
                            </div>
                        </template>
                    </div>
                    <div class="avisos-zona" role="alert">
                        <template x-for="aviso in de('error')" :key="aviso.id">
                            <div class="toast toast-error">
                                <span class="toast-cuerpo">{!! Iconos::svg('alerta', 20) !!}<span><span class="visually-hidden">Error: </span><span x-text="aviso.mensaje"></span></span></span>
                                <button type="button" class="toast-cerrar" @click="quitar(aviso.id)" aria-label="Cerrar aviso">{!! Iconos::svg('x', 18) !!}</button>
                            </div>
                        </template>
                    </div>
                </div>

                @yield('content')
            </main>
        </div>
    </div>
</body>
</html>
