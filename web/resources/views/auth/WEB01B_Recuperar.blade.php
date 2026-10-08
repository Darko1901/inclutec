<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IncluTec - Recuperar Contraseña</title>
    <link rel="icon" href="/img/icon.png">
    <link rel="stylesheet" href="/css/admin.css">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
</head>
<body x-data="{ darkMode: false }" x-init="darkMode = JSON.parse(localStorage.getItem('darkMode') || 'false'); `$watch('darkMode', val => localStorage.setItem('darkMode', val))" :class="{'dark': darkMode}">
    <button @click="darkMode = !darkMode" style="position: absolute; top: 1.5rem; right: 1.5rem; background:transparent; border:none; cursor:pointer; color:var(--text-main); z-index: 50;">
        <svg x-show="!darkMode" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        <svg x-show="darkMode" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    </button>
    <div class="auth-wrapper wow-animate-fade-up">
        <div class="auth-card">
            <div class="auth-logo" style="margin-bottom: 1rem;">
                <img src="/img/icon.png" alt="IncluTec Logo">
                <span>Recuperación</span>
            </div>
            <p style="text-align:center; color:var(--text-muted); margin-bottom:2rem; line-height:1.5;">Ingresa el correo electrónico asociado a tu cuenta maestra y te enviaremos instrucciones.</p>
            
            <form action="/" method="GET">
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label class="form-label" for="email">Correo Electrónico</label>
                    <input type="email" id="email" class="form-control" placeholder="admin@inclutec.com" required>
                </div>
                <div style="display:flex; gap:1rem;">
                    <a href="/" class="btn btn-outline" style="flex:1;">Cancelar</a>
                    <button type="submit" class="btn btn-primary" style="flex:1;">Enviar Enlace</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
