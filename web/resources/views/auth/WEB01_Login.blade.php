<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IncluTec - Iniciar Sesión</title>
    <link rel="icon" href="/img/icon.png">
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
    <div class="auth-wrapper">
        <div class="auth-card">
            <div class="auth-logo">
                <img src="/img/icon.png" alt="IncluTec Logo">
                <span>IncluTec</span>
                <div style="font-size: 1rem; color: var(--text-muted); font-weight: 400; font-family:'Inter', sans-serif;">Panel de Administración</div>
            </div>
            
            <form action="/dashboard" method="GET">
                <div class="form-group">
                    <label class="form-label" for="email">Correo Electrónico</label>
                    <input type="email" id="email" class="form-control" placeholder="admin@inclutec.com" required>
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <label class="form-label" for="password">Contraseña</label>
                    <input type="password" id="password" class="form-control" placeholder="••••••••" required>
                </div>
                <div style="text-align: right; margin-bottom: 2rem;">
                    <a href="/recuperar" style="font-size: 0.875rem; font-weight: 500;">¿Olvidaste tu contraseña?</a>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; font-size:1rem; padding: 0.75rem;">Siguiente</button>
            </form>
        </div>
    </div>
</body>
</html>
