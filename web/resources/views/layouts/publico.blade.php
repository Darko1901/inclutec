<!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('titulo', 'Panel') · IncluTec Admin</title>
    <link rel="icon" href="/img/icon.png">
    @vite(['resources/css/admin.css', 'resources/js/app.js'])
</head>
<body x-data="{ darkMode: false }" x-init="darkMode = JSON.parse(localStorage.getItem('darkMode') || 'false'); $watch('darkMode', val => localStorage.setItem('darkMode', val))" :class="{'dark': darkMode}">
    <a href="#contenido" class="saltar-contenido">Saltar al contenido</a>
    <main id="contenido" class="auth-wrapper" tabindex="-1">
        @yield('content')
    </main>
</body>
</html>
