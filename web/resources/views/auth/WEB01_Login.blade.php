<!DOCTYPE html>
<html lang="es-MX">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IncluTec - Iniciar Sesión</title>
    <link rel="icon" href="/img/icon.png">
    <link rel="stylesheet" href="/css/admin.css">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
</head>
<body x-data="{ darkMode: false }" x-init="darkMode = JSON.parse(localStorage.getItem('darkMode') || 'false'); `$watch('darkMode', val => localStorage.setItem('darkMode', val))" :class="{'dark': darkMode}">
    <button @click="darkMode = !darkMode" style="position: absolute; top: 1.5rem; right: 1.5rem; background:transparent; border:none; cursor:pointer; color:var(--text-main); z-index: 50;">
        <svg x-show="!darkMode" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        <svg x-show="darkMode" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:none;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    </button>
    <div class="auth-wrapper ">
        <div class="auth-card" x-data="{ 
            email: '', 
            password: '', 
            hasError: false, 
            errorMsg: '',
            isSubmitting: false,
            doLogin() {
                this.hasError = false;
                this.isSubmitting = true;
                
                // Simular retraso de red
                setTimeout(() => {
                    this.isSubmitting = false;
                    
                    if (this.email === 'suspendida@correo.mx') {
                        this.errorMsg = 'Tu cuenta está suspendida. Contacta a soporte.';
                        this.hasError = true;
                        $nextTick(() => $refs.errorAlert.focus());
                    }
                    else if (this.email !== 'admin@inclutec.mx' || this.password !== 'Inclutec2026') {
                        this.errorMsg = 'Correo o contraseña incorrectos. Verifica tus credenciales.';
                        this.hasError = true;
                        $nextTick(() => $refs.errorAlert.focus());
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 800);
            }
        }">
            <div class="auth-logo">
                <img src="/img/icon.png" alt="IncluTec Logo">
                <span>IncluTec</span>
                <div style="font-size: 1rem; color: var(--text-muted); font-weight: 400; font-family:'Inter', sans-serif;">Panel de Administración</div>
            </div>
            
            <!-- Alert Box de Errores Accesible -->
            <div x-show="hasError" x-ref="errorAlert" tabindex="-1" role="alert" style="display:none; background-color:var(--danger); color:white; padding:1rem; border-radius:6px; margin-bottom:1.5rem; font-weight:500; font-size:0.9rem; align-items:center; gap:0.5rem; box-shadow:0 4px 6px rgba(0,0,0,0.1);" x-transition>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span x-text="errorMsg"></span>
            </div>

            <form @submit.prevent="doLogin()">
                <div class="form-group">
                    <label class="form-label" for="email">Correo Electrónico</label>
                    <input type="email" id="email" class="form-control" x-model="email" :aria-invalid="hasError.toString()" aria-required="true" placeholder="admin@inclutec.mx" required>
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <label class="form-label" for="password">Contraseña</label>
                    <input type="password" id="password" class="form-control" x-model="password" :aria-invalid="hasError.toString()" aria-required="true" placeholder="••••••••" required>
                </div>
                <div style="text-align: right; margin-bottom: 2rem;">
                    <a href="/recuperar" style="font-size: 0.875rem; font-weight: 500;">¿Olvidaste tu contraseña?</a>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="isSubmitting" style="width: 100%; font-size:1rem; padding: 0.75rem;"><span x-show="!isSubmitting">Iniciar Sesión</span><span x-show="isSubmitting">Cargando...</span></button>
            </form>
        </div>
    </div>
</body>
</html>
