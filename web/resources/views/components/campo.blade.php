@props([
    'nombre',
    'etiqueta',
    'tipo' => 'text',
    'valor' => null,
    'ayuda' => null,
    'obligatorio' => false,
    'error' => null,
    'maximo' => null,
    'opciones' => [],
    'vacio' => null,
    'filas' => 4,
    'placeholder' => null,
    'id' => null,
    'sinAntiguos' => false,
])
@php
    use App\Support\Iconos;

    $id = $id ?? str_replace(['.', '[', ']'], '-', $nombre);
    // Las contraseñas nunca se vuelven a mostrar.
    $actual = $tipo === 'password' ? '' : (string) ($sinAntiguos ? ($valor ?? '') : old($nombre, $valor ?? ''));
    $mensaje = $error ?? $errors->first($nombre);
    $describe = trim(($ayuda ? "ayuda-{$id} " : '').($maximo ? "contador-{$id} " : '').($mensaje ? "error-{$id}" : ''));
    $atributosControl = $attributes->except('class')->merge([
        'id' => $id,
        'name' => $nombre,
        'aria-invalid' => $mensaje ? 'true' : 'false',
        'aria-describedby' => $describe ?: null,
        'required' => $obligatorio ?: null,
        'aria-required' => $obligatorio ? 'true' : null,
        'maxlength' => $maximo,
        'placeholder' => $placeholder,
    ]);
@endphp
<div {{ $attributes->only('class')->class(['form-group']) }} @if ($maximo) x-data="contador({{ mb_strlen($actual) }})" @endif>
    <label class="form-label" for="{{ $id }}">
        {{ $etiqueta }}
        @if ($obligatorio)
            <span class="form-obligatorio" aria-hidden="true">*</span><span class="visually-hidden">(obligatorio)</span>
        @endif
    </label>

    @if ($tipo === 'select')
        <select {{ $atributosControl->class(['form-control']) }}>
            @if ($vacio !== null)
                <option value="">{{ $vacio }}</option>
            @endif
            @foreach ($opciones as $clave => $texto)
                <option value="{{ $clave }}" @selected((string) $clave === $actual)>{{ $texto }}</option>
            @endforeach
        </select>
    @elseif ($tipo === 'textarea')
        <textarea {{ $atributosControl->class(['form-control'])->merge(['rows' => $filas]) }} @if ($maximo) @input="cantidad = $event.target.value.length" @endif>{{ $actual }}</textarea>
    @else
        <input type="{{ $tipo }}" {{ $atributosControl->class(['form-control']) }} @if ($tipo !== 'password') value="{{ $actual }}" @endif @if ($maximo) @input="cantidad = $event.target.value.length" @endif>
    @endif

    @if ($ayuda)
        <div id="ayuda-{{ $id }}" class="form-ayuda">{{ $ayuda }}</div>
    @endif
    @if ($maximo)
        {{-- El contador no se anuncia en cada tecla: solo es información visible. --}}
        <div id="contador-{{ $id }}" class="form-ayuda"><span x-text="cantidad">{{ mb_strlen($actual) }}</span> de {{ $maximo }} caracteres</div>
    @endif
    @if ($mensaje)
        <div id="error-{{ $id }}" class="form-error">{!! Iconos::svg('alerta', 16) !!}<span>{{ $mensaje }}</span></div>
    @endif
</div>
