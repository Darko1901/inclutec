<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página no encontrada - IncluTec</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1E40AF;
            --primary-light: #3B82F6;
            --secondary: #0F766E;
            --bg-color: #F3F4F6;
            --text-main: #1F2937;
            --text-muted: #6B7280;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            color: var(--text-main);
            text-align: center;
        }
        .error-container {
            max-width: 500px;
            padding: 3rem;
            background: #FFF;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }
        .error-code {
            font-size: 6rem;
            font-weight: 700;
            color: var(--primary);
            line-height: 1;
            margin-bottom: 1rem;
        }
        .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }
        .error-msg {
            color: var(--text-muted);
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .btn-home {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--primary);
            color: #FFF;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
        }
        .btn-home:hover {
            background: var(--primary-light);
        }
        .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>

    <div class="error-container">
        <img src="{{ asset('img/icon.png') }}" alt="IncluTec Logo" class="logo">
        <div class="error-code">404</div>
        <div class="error-title">Página no encontrada</div>
        <div class="error-msg">
            Lo sentimos, la ruta a la que intentas acceder no existe o fue movida. Verifica la URL o regresa al inicio.
        </div>
        <a href="{{ url('/dashboard') }}" class="btn-home">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Volver al Panel
        </a>
    </div>

</body>
</html>