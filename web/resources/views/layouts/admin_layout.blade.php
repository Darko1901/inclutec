<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="view-transition" content="same-origin">
    <title>IncluTec</title>
    <link rel="stylesheet" href="/css/admin.css">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body x-data="{ toasts: [] }" @notify.window="toasts.push({ id: Date.now(), msg: $event.detail.msg, type: $event.detail.type }); setTimeout(() => { toasts.shift() }, 3000)">
    
    <!-- Sistema de Notificaciones (Toasts) -->
    <div class="toast-container">
        <template x-for="toast in toasts" :key="toast.id">
            <div class="toast" :class="toast.type === 'success' ? 'toast-success' : 'toast-error'" x-transition.duration.300ms>
                <svg x-show="toast.type === 'success'" fill="none" stroke="var(--success)" viewBox="0 0 24 24" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span x-text="toast.msg"></span>
            </div>
        </template>
    </div>

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
                
                <div style="margin: 1.5rem 1.5rem 0.5rem; font-size:0.75rem; color:#475569; font-weight:800; text-transform:uppercase; letter-spacing: 1px;">Sistema</div>
                
                <a href="/perfil" class="sidebar-link {{ request()->is('perfil') ? 'active' : '' }}" aria-label="Mi Perfil">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    Mi Perfil
                </a>
                <a href="/configuracion" class="sidebar-link {{ request()->is('configuracion') ? 'active' : '' }}" aria-label="Configuración">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="square" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Configuración
                </a>
            </nav>
            <div style="padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <a href="/" class="btn btn-outline" style="width: 100%; border-color: #334155; color: #94A3B8;">Cerrar Sesión</a>
            </div>
        </aside>

        <main class="main-content" role="main">
            <header class="topbar">
                <div></div>
                <div style="display:flex; align-items:center; gap: 1rem;">
                    <div style="text-align: right;">
                        <div style="font-weight: 800; font-size: 0.95rem;">Admin General</div>
                        <div style="font-size: 0.8rem; color: #6B7280; font-weight:500;">admin@inclutec.com</div>
                    </div>
                    <div style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem; box-shadow: 0 4px 6px -1px rgba(0,82,255,0.3);">
                        A
                    </div>
                </div>
            </header>
            <div class="content-body" x-data>
                @yield('content')
            </div>
        </main>
    </div>
</body>
</html>
