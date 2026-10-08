<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="view-transition" content="same-origin">
    <title>IncluTec - Login</title>
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
    <div class="auth-wrapper">
        <div class="auth-card" style="box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border:none;">
            <div class="auth-logo">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; display:block; margin: 0 auto 1rem;"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                IncluTec
                <div style="font-size: 1rem; color: #6B7280; font-weight: 500; margin-top:0.5rem;">Panel de Administración</div>
            </div>
            
            <form action="/dashboard" method="GET">
                <div class="form-group">
                    <label class="form-label" for="email">Correo Electrónico Administrador</label>
                    <input type="email" id="email" class="form-control" placeholder="admin@inclutec.com" required>
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <label class="form-label" for="password">Contraseña Maestra</label>
                    <input type="password" id="password" class="form-control" placeholder="••••••••" required>
                </div>
                <div style="text-align: right; margin-bottom: 2rem;">
                    <a href="/recuperar" style="font-size: 0.85rem; font-weight: 600;">¿Olvidaste tu contraseña?</a>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; font-size:1.1rem; padding: 1rem;">Ingresar al Sistema</button>
            </form>
        </div>
    </div>
</body>
</html>
