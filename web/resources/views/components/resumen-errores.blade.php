@props(['errores' => null, 'mensaje' => null, 'titulo' => 'Revisa los datos marcados.'])
@php
    use App\Support\Iconos;

    // Por omisión toma los errores de validación y el mensaje flash `error` de la sesión.
    $fuente = $errores ?? $errors->getBag('default');
    $lista = collect($fuente instanceof \Illuminate\Contracts\Support\MessageBag ? $fuente->messages() : $fuente)
        ->map(fn ($texto) => is_array($texto) ? ($texto[0] ?? null) : $texto)
        ->filter()
        ->all();
    $mensaje = $mensaje ?? session('error');
@endphp
@if ($lista || $mensaje)
    {{-- role="alert" lo anuncia y el foco se mueve aquí al aparecer; cada error enlaza a su campo. --}}
    <div id="resumen-errores" {{ $attributes->class(['resumen-errores']) }} role="alert" tabindex="-1" x-data x-init="$nextTick(() => $el.focus())">
        <div class="resumen-errores-titulo">
            {!! Iconos::svg('alerta', 20) !!}
            <span>{{ $mensaje ?? $titulo }}</span>
        </div>
        @if ($lista)
            <ul>
                @foreach ($lista as $campo => $texto)
                    <li><a href="#{{ str_replace(['.', '[', ']'], '-', $campo) }}">{{ $texto }}</a></li>
                @endforeach
            </ul>
        @endif
    </div>
@endif
