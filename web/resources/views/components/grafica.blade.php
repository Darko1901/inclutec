@props(['grafica'])
@php
    use App\Support\Iconos;

    /*
     | Gráfica del dashboard, dibujada en el servidor sin bibliotecas. `$grafica` lo arma
     | PresentadorEstadisticas: id, tipo (barras|lineas), titulo, descripcion, nota, columna, series,
     | vacio y filas [etiqueta, valores, estado?]. Cada gráfica trae sus valores escritos y su tabla.
     */
    $id = 'grafica-'.$grafica['id'];
    $filas = $grafica['filas'];
    $series = $grafica['series'];
    $columnas = array_merge([$grafica['columna']], $series);
    $maximo = $filas === [] ? 1 : max(1, ...array_merge(...array_column($filas, 'valores')));
    $conLeyenda = count($series) > 1;
    $resumen = $grafica['titulo'].'. '.implode('. ', array_map(
        fn ($fila) => $fila['etiqueta'].': '.implode(', ', array_map(fn ($valor, $n) => $series[$n].' '.$valor, $fila['valores'], array_keys($fila['valores']))),
        $filas,
    ));
@endphp

@once
    {{-- Trama de rayas a 45° de la segunda serie: la distingue de la primera sin depender del color. --}}
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
        <defs>
            <pattern id="viz-trama" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" style="fill: var(--viz-2)"></rect>
                <rect width="2.5" height="6" style="fill: var(--viz-superficie); opacity: 0.6"></rect>
            </pattern>
        </defs>
    </svg>
@endonce

<section id="{{ $id }}" {{ $attributes->class(['card', 'grafica', 'grafica-ancha' => $grafica['tipo'] === 'lineas']) }} aria-labelledby="{{ $id }}-titulo" x-data="{ tabla: false }">
    <div class="grafica-encabezado">
        <div>
            <h3 id="{{ $id }}-titulo" class="grafica-titulo">{{ $grafica['titulo'] }}</h3>
            <p class="grafica-descripcion">{{ $grafica['descripcion'] }}</p>
        </div>
        @if ($filas !== [])
            <button type="button" class="btn btn-outline grafica-boton" @click="tabla = !tabla"
                    aria-expanded="false" :aria-expanded="tabla.toString()" aria-controls="{{ $id }}-tabla">
                Ver como tabla
                <span class="grafica-chevron" :class="{ 'abierto': tabla }">{!! Iconos::svg('chevron-abajo', 16) !!}</span>
            </button>
        @endif
    </div>

    @if ($filas === [])
        <p class="grafica-vacia">{{ $grafica['vacio'] }}</p>
    @else
        @if ($conLeyenda)
            <ul class="grafica-leyenda" aria-label="Leyenda">
                @foreach ($series as $n => $nombre)
                    <li>
                        <svg width="28" height="14" aria-hidden="true" focusable="false">
                            @if ($grafica['tipo'] === 'lineas')
                                <line x1="0" y1="7" x2="28" y2="7" stroke-width="2" style="stroke: var(--viz-{{ $n + 1 }})" @if ($n === 1) stroke-dasharray="6 4" @endif></line>
                                @if ($n === 0)
                                    <circle cx="14" cy="7" r="5" style="fill: var(--viz-1); stroke: var(--viz-superficie)" stroke-width="2"></circle>
                                @else
                                    <rect x="9" y="2" width="10" height="10" style="fill: var(--viz-2); stroke: var(--viz-superficie)" stroke-width="2"></rect>
                                @endif
                            @else
                                <rect x="0" y="1" width="28" height="12" rx="3" style="fill: {{ $n === 0 ? 'var(--viz-1)' : 'url(#viz-trama)' }}"></rect>
                            @endif
                        </svg>
                        <span>{{ $nombre }}</span>
                    </li>
                @endforeach
            </ul>
        @endif

        @if ($grafica['tipo'] === 'barras')
            <ul class="barras">
                @foreach ($filas as $fila)
                    <li class="barra-grupo">
                        <span class="barra-etiqueta">{{ $fila['etiqueta'] }}</span>
                        <div class="barra-series">
                            @foreach ($fila['valores'] as $n => $valor)
                                <div class="barra-pista">
                                    <svg class="barra" style="width: {{ $valor === 0 ? 0 : max(1.5, round($valor / $maximo * 84, 1)) }}%" height="18" aria-hidden="true" focusable="false">
                                        <rect width="100%" height="18" rx="4" style="fill: {{ $n === 0 ? 'var(--viz-1)' : 'url(#viz-trama)' }}"></rect>
                                    </svg>
                                    <span class="barra-valor">
                                        @if ($conLeyenda)<span class="visually-hidden">{{ $series[$n] }}: </span>@endif{{ number_format($valor) }}
                                    </span>
                                </div>
                            @endforeach
                        </div>
                    </li>
                @endforeach
            </ul>
        @else
            @php
                // Geometría de la línea (unidades del viewBox).
                $ancho = 640; $alto = 300; $izq = 44; $der = 24; $arriba = 28; $abajo = 56;
                $areaX = $ancho - $izq - $der; $areaY = $alto - $arriba - $abajo;
                $paso = collect([1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000])
                    ->first(fn ($p) => ceil($maximo / $p) <= 5) ?? 10000;
                $tope = max(1, (int) (ceil($maximo / $paso) * $paso));
                $total = count($filas);
                $px = fn (int $i) => $total === 1 ? $izq + $areaX / 2 : $izq + 24 + $i * ($areaX - 48) / ($total - 1);
                $py = fn (int $v) => $arriba + $areaY * (1 - $v / $tope);
            @endphp
            <div class="linea-contenedor" tabindex="0" role="region" aria-label="{{ $grafica['titulo'] }}: gráfica de líneas">
                <svg class="linea" viewBox="0 0 {{ $ancho }} {{ $alto }}" role="img" aria-label="{{ $resumen }}" focusable="false">
                    @for ($marca = 0; $marca <= $tope; $marca += $paso)
                        <line x1="{{ $izq }}" x2="{{ $ancho - $der }}" y1="{{ $py($marca) }}" y2="{{ $py($marca) }}" class="linea-rejilla"></line>
                        <text x="{{ $izq - 8 }}" y="{{ $py($marca) + 4 }}" text-anchor="end" class="linea-eje">{{ number_format($marca) }}</text>
                    @endfor
                    @foreach ($series as $n => $nombre)
                        <polyline fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="stroke: var(--viz-{{ $n + 1 }})"
                                  @if ($n === 1) stroke-dasharray="6 4" @endif
                                  points="{{ collect($filas)->map(fn ($fila, $i) => round($px($i), 1).','.round($py($fila['valores'][$n]), 1))->implode(' ') }}"></polyline>
                    @endforeach
                    @foreach ($filas as $i => $fila)
                        @php
                            [$v1, $v2] = $fila['valores'];
                            // La serie que queda más arriba lleva su valor encima; la otra, debajo.
                            $arribaPrimera = $v1 >= $v2;
                        @endphp
                        <text x="{{ round($px($i), 1) }}" y="{{ $alto - $abajo + 20 }}" text-anchor="middle" class="linea-eje">{{ $fila['mes'] }}</text>
                        @if ($i === 0 || $fila['anio'] !== $filas[$i - 1]['anio'])
                            <text x="{{ round($px($i), 1) }}" y="{{ $alto - $abajo + 36 }}" text-anchor="middle" class="linea-eje">{{ $fila['anio'] }}</text>
                        @endif
                        <circle cx="{{ round($px($i), 1) }}" cy="{{ round($py($v1), 1) }}" r="5" stroke-width="2" style="fill: var(--viz-1); stroke: var(--viz-superficie)"></circle>
                        <rect x="{{ round($px($i) - 5, 1) }}" y="{{ round($py($v2) - 5, 1) }}" width="10" height="10" stroke-width="2" style="fill: var(--viz-2); stroke: var(--viz-superficie)"></rect>
                        <text x="{{ round($px($i), 1) }}" y="{{ round($py($v1) + ($arribaPrimera ? -11 : 20), 1) }}" text-anchor="middle" class="linea-valor">{{ $v1 }}</text>
                        <text x="{{ round($px($i), 1) }}" y="{{ round($py($v2) + ($arribaPrimera ? 20 : -11), 1) }}" text-anchor="middle" class="linea-valor">{{ $v2 }}</text>
                    @endforeach
                </svg>
            </div>
        @endif

        @if (! empty($grafica['nota']))
            <p class="grafica-nota">{{ $grafica['nota'] }}</p>
        @endif

        <div id="{{ $id }}-tabla" class="grafica-tabla" x-show="tabla" x-cloak>
            <x-tabla :caption="$grafica['titulo']" :columnas="$columnas">
                @foreach ($filas as $fila)
                    <tr>
                        <td class="grafica-tabla-etiqueta">
                            @if (isset($fila['estado']))
                                <x-insignia-estado :entidad="$fila['estado'][0]" :valor="$fila['estado'][1]" />
                            @else
                                {{ $fila['etiqueta'] }}
                            @endif
                        </td>
                        @foreach ($fila['valores'] as $valor)
                            <td class="grafica-tabla-valor">{{ number_format($valor) }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </x-tabla>
        </div>
    @endif
</section>
