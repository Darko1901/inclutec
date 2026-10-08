<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="view-transition" content="same-origin">
    <title>IncluTec</title>
    <link rel="stylesheet" href="/css/admin.css">
    <!-- Alpine.js para interactividad sin backend -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body>
    <div class="admin-layout">
        <aside class="sidebar" aria-label="Menú principal">
            <div class="sidebar-header">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:28px; color:var(--primary);"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                IncluTec
            </div>
            <nav class="sidebar-nav">
                <a href="/dashboard" class="sidebar-link {{ request()->is('dashboard') ? 'active' : '' }}" aria-label="Dashboard">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    Dashboard
                </a>
                <a href="/usuarios" class="sidebar-link {{ request()->is('usuarios') ? 'active' : '' }}" aria-label="Usuarios">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    Usuarios
                </a>
                <a href="/empresas" class="sidebar-link {{ request()->is('empresas') ? 'active' : '' }}" aria-label="Empresas">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    Empresas
                </a>
                <a href="/vacantes" class="sidebar-link {{ request()->is('vacantes') ? 'active' : '' }}" aria-label="Vacantes">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    Vacantes
                </a>
                <a href="/habilidades" class="sidebar-link {{ request()->is('habilidades') ? 'active' : '' }}" aria-label="Habilidades">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                    Habilidades
                </a>
                <a href="/catalogos" class="sidebar-link {{ request()->is('catalogos') ? 'active' : '' }}" aria-label="Catálogos">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                    Catálogos
                </a>
                <a href="/reportes" class="sidebar-link {{ request()->is('reportes') ? 'active' : '' }}" aria-label="Reportes">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Reportes
                </a>
            </nav>
            <div style="padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                <a href="/" class="btn btn-outline" style="width: 100%; border-color: #4B5563; color: #E5E7EB;">Cerrar Sesión</a>
            </div>
        </aside>

        <main class="main-content" role="main">
            <header class="topbar">
                <div>
                    <!-- Breadcrumb space -->
                </div>
                <div style="display:flex; align-items:center; gap: 1rem;">
                    <div style="text-align: right;">
                        <div style="font-weight: 700; font-size: 0.9rem;">Admin General</div>
                        <div style="font-size: 0.8rem; color: #6B7280;">admin@inclutec.com</div>
                    </div>
                    <div style="width:40px; height:40px; background:var(--primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem;">
                        A
                    </div>
                </div>
            </header>
            <div class="content-body">
                @yield('content')
            </div>
        </main>
    </div>
</body>
</html>
