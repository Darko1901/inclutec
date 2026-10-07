import { renderHook, waitFor, act } from '@testing-library/react-native';

import { catalogos } from '../servicios';
import { useCatalogo } from '../useCatalogo';

describe('useCatalogo', () => {
  afterEach(() => jest.restoreAllMocks());

  it('carga el catálogo y marca cargando mientras tanto', async () => {
    const { result } = await renderHook(() => useCatalogo('modalidades'));
    expect(result.current.cargando).toBe(true);

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.datos.map((d) => d.nombre)).toEqual(['Híbrido', 'Presencial', 'Remoto']);
    expect(result.current.error).toBeNull();
  });

  it('vuelve a pedirlo si cambian los filtros', async () => {
    const { result, rerender } = await renderHook(
      ({ entidad }: { entidad: number }) => useCatalogo('municipios', { entidad_id: entidad }),
      { initialProps: { entidad: 22 } },
    );
    await waitFor(() => expect(result.current.datos).toHaveLength(4));

    await rerender({ entidad: 19 });
    await waitFor(() => expect(result.current.datos.map((d) => d.nombre)).toEqual(['Monterrey']));
  });

  it('no pide nada si no está habilitado', async () => {
    const listar = jest.spyOn(catalogos, 'listar');
    const { result } = await renderHook(() => useCatalogo('municipios', undefined, false));

    expect(result.current.cargando).toBe(false);
    expect(result.current.datos).toEqual([]);
    expect(listar).not.toHaveBeenCalled();
  });

  it('guarda los catálogos: una segunda pantalla no vuelve a pedirlos', async () => {
    const listar = jest.spyOn(catalogos, 'listar');
    const primera = await renderHook(() => useCatalogo('sectores'));
    await waitFor(() => expect(primera.result.current.cargando).toBe(false));

    const segunda = await renderHook(() => useCatalogo('sectores'));

    expect(segunda.result.current.cargando).toBe(false);
    expect(segunda.result.current.datos).toHaveLength(7);
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('expone el error y permite reintentar', async () => {
    jest.spyOn(catalogos, 'listar').mockRejectedValueOnce(new Error('sin red'));
    const { result } = await renderHook(() => useCatalogo('jornadas'));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.codigo).toBe('error_interno');

    await act(async () => result.current.recargar());

    await waitFor(() => expect(result.current.datos).toHaveLength(4));
    expect(result.current.error).toBeNull();
  });
});
