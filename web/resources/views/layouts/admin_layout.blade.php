<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IncluTec - Admin Web</title>
    <link rel="stylesheet" href="/css/admin.css">
    <!-- Etiquetas ARIA para accesibilidad -->
</head>
<body>
    <div class="admin-layout">
        <!-- Sidebar responsivo -->
        <aside class="sidebar" aria-label="Menú principal">
            <div class="sidebar-header">
                IncluTec Admin
            </div>
            <nav class="sidebar-nav">
                <a href="/dashboard" class="sidebar-link" aria-label="Ir a Dashboard">WEB-02 Dashboard</a>
                <a href="/usuarios" class="sidebar-link" aria-label="Ir a Usuarios">WEB-03 Usuarios</a>
                <a href="/empresas" class="sidebar-link" aria-label="Ir a Empresas">WEB-04 Empresas</a>
                <a href="/vacantes" class="sidebar-link" aria-label="Ir a Vacantes">WEB-05 Vacantes</a>
                <a href="/habilidades" class="sidebar-link" aria-label="Ir a Habilidades">WEB-06 Habilidades</a>
                <a href="/catalogos" class="sidebar-link" aria-label="Ir a Catálogos">WEB-07 Catálogos</a>
                <a href="/reportes" class="sidebar-link" aria-label="Ir a Reportes">WEB-08 Reportes</a>
            </nav>
            <div style="padding: 1rem;">
                <a href="/" class="btn btn-outline" style="width: 100%; text-align: center;">Cerrar Sesión</a>
            </div>
        </aside>

        <!-- Contenido Principal -->
        <main class="main-content" role="main">
            <header class="topbar">
                <span style="font-weight: 600;">Administrador General</span>
            </header>
            <div class="content-body">
                @yield('content')
            </div>
        </main>
    </div>
</body>
</html>
