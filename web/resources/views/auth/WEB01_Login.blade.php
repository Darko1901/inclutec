<!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar sesión · IncluTec Admin</title>
    <link rel="icon" href="/img/icon.png">
    @vite(['resources/css/admin.css', 'resources/js/app.js'])
</head>
<body x-data="{ darkMode: false }" x-init="darkMode = JSON.parse(localStorage.getItem('darkMode') || 'false'); $watch('darkMode', val => localStorage.setItem('darkMode', val))" :class="{'dark': darkMode}">
    <button @click="darkMode = !darkMode" aria-label="Alternar modo oscuro" :aria-pressed="darkMode.toString()" aria-pressed="false" class="boton-icono boton-tema-login">
        <svg x-show="!darkMode" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        <svg x-show="darkMode" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    </button>
    @php
        $marcados = array_merge(session('campos_invalidos', []), $errors->keys());
        // Si el campo tiene su propio mensaje, el lector de pantalla lo lee; si no, lee el resumen.
        $descripcion = fn (string $campo, ?string $ayuda = null) => trim(
            ($errors->has($campo) ? 'error-'.$campo : (in_array($campo, $marcados, true) ? 'resumen-errores' : '')).' '.$ayuda
        );
    @endphp
    <main class="auth-wrapper">
        <div class="auth-card" x-data="{
            correo: @js(old('correo', '')),
            contrasena: '',
            verContrasena: false,
            get valido() {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo.trim()) && this.contrasena.length >= 8;
            }
        }">
            <h1 class="visually-hidden">Iniciar sesión en el panel de administración</h1>
            <div class="auth-logo">
                <img src="/img/icon.png" alt="IncluTec Logo">
                <span>IncluTec</span>
                <div class="auth-subtitulo">Panel de Administración</div>
            </div>

            {{-- Resumen de errores: se anuncia al lector de pantalla y recibe el foco al aparecer. --}}
            <x-resumen-errores />

            <form method="POST" action="{{ route('login.entrar') }}" novalidate>
                @csrf
                <div class="form-group">
                    <label class="form-label" for="correo">Correo electrónico</label>
                    <input type="email" id="correo" name="correo" class="form-control" x-model="correo" value="{{ old('correo') }}" autocomplete="username" maxlength="254" required aria-required="true" placeholder="correo@ejemplo.mx"
                           aria-invalid="{{ in_array('correo', $marcados, true) ? 'true' : 'false' }}" @if ($d = $descripcion('correo')) aria-describedby="{{ $d }}" @endif>
                    @error('correo')
                        <div id="error-correo" class="form-error">{{ $message }}</div>
                    @enderror
                </div>
                <div class="form-group form-group-compacto">
                    <label class="form-label" for="contrasena">Contraseña</label>
                    <input :type="verContrasena ? 'text' : 'password'" type="password" id="contrasena" name="contrasena" class="form-control" x-model="contrasena" autocomplete="current-password" minlength="8" maxlength="64" required aria-required="true"
                           aria-invalid="{{ in_array('contrasena', $marcados, true) ? 'true' : 'false' }}" aria-describedby="{{ $descripcion('contrasena', 'ayuda-contrasena') }}">
                    <div id="ayuda-contrasena" class="form-ayuda">Mínimo 8 caracteres.</div>
                    @error('contrasena')
                        <div id="error-contrasena" class="form-error">{{ $message }}</div>
                    @enderror
                </div>
                <div class="auth-acciones-contrasena">
                    <button type="button" class="btn-texto" @click="verContrasena = !verContrasena" :aria-pressed="verContrasena.toString()" aria-pressed="false" aria-controls="contrasena">
                        <svg x-show="!verContrasena" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        <svg x-show="verContrasena" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                        Mostrar contraseña
                    </button>
                </div>
                <button type="submit" class="btn btn-primary btn-bloque" :disabled="!valido">Iniciar Sesión</button>
            </form>
        </div>
    </main>
</body>
</html>
