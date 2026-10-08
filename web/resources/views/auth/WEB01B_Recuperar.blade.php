<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="view-transition" content="same-origin">
    <title>IncluTec - Recuperar Contraseña</title>
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
    <div class="auth-wrapper">
        <div class="auth-card" style="box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border:none;">
            <div class="auth-logo" style="font-size:1.5rem;">
                Recuperación de Acceso
            </div>
            <p style="color: #6B7280; text-align:center; margin-bottom: 2rem; font-size:0.95rem;">
                Ingresa tu correo de administrador. Te enviaremos instrucciones de seguridad para restablecer tu contraseña maestra.
            </p>
            
            <form action="/" method="GET">
                <div class="form-group">
                    <label class="form-label" for="email">Correo Electrónico</label>
                    <input type="email" id="email" class="form-control" placeholder="admin@inclutec.com" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; font-size:1rem; padding: 0.8rem; margin-bottom: 1rem;">Enviar Enlace de Recuperación</button>
                <div style="text-align: center;">
                    <a href="/" style="font-size: 0.9rem; font-weight: 600; color:#6B7280;">← Volver al inicio de sesión</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
