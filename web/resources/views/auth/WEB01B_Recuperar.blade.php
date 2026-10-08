<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IncluTec - Recuperar Contraseña</title>
    <link rel="icon" href="/img/icon.png">
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
    <div class="auth-wrapper">
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
