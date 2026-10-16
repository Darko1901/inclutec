@props(['total', 'page' => 1, 'size' => 25, 'etiqueta' => 'Paginación'])
@php
    use App\Support\Iconos;

    // Recibe lo mismo que devuelve el API (total, page, size). Los enlaces conservan los filtros de la URL.
    $total = max(0, (int) $total);
    $size = max(1, (int) $size);
    $paginas = max(1, (int) ceil($total / $size));
    $actual = min(max(1, (int) $page), $paginas);
    $desde = $total === 0 ? 0 : ($actual - 1) * $size + 1;
    $hasta = min($total, $actual * $size);

    $visibles = collect([1, $paginas, $actual - 1, $actual, $actual + 1])
        ->filter(fn ($n) => $n >= 1 && $n <= $paginas)->unique()->sort()->values();

    $url = fn (int $n) => request()->fullUrlWithQuery(['page' => $n]);
@endphp
@if ($paginas > 1)
    <nav class="pagination" aria-label="{{ $etiqueta }}">
        <p>Mostrando {{ $desde }} a {{ $hasta }} de {{ $total }}</p>
        <ul class="pagination-controls">
            <li>
                @if ($actual > 1)
                    <a class="page-btn" href="{{ $url($actual - 1) }}" rel="prev">{!! Iconos::svg('flecha-izquierda', 16) !!}<span>Anterior</span></a>
                @else
                    <span class="page-btn" aria-disabled="true">{!! Iconos::svg('flecha-izquierda', 16) !!}<span>Anterior</span></span>
                @endif
            </li>
            @foreach ($visibles as $i => $n)
                @if ($i > 0 && $n - $visibles[$i - 1] > 1)
                    <li><span class="page-puntos" aria-hidden="true">…</span></li>
                @endif
                <li>
                    @if ($n === $actual)
                        <a class="page-btn active" href="{{ $url($n) }}" aria-current="page" aria-label="Página {{ $n }}">{{ $n }}</a>
                    @else
                        <a class="page-btn" href="{{ $url($n) }}" aria-label="Página {{ $n }}">{{ $n }}</a>
                    @endif
                </li>
            @endforeach
            <li>
                @if ($actual < $paginas)
                    <a class="page-btn" href="{{ $url($actual + 1) }}" rel="next"><span>Siguiente</span>{!! Iconos::svg('flecha-derecha', 16) !!}</a>
                @else
                    <span class="page-btn" aria-disabled="true"><span>Siguiente</span>{!! Iconos::svg('flecha-derecha', 16) !!}</span>
                @endif
            </li>
        </ul>
    </nav>
@endif
