<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** WEB-06 y WEB-07 contra el API real (INCLUTEC_API_MOCK=false), con las respuestas del contrato. */
class CatalogosConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    /** El ejemplo de CategoriaAdmin del contrato. */
    private function categoria(array $cambios = []): array
    {
        return $cambios + ['id' => 1, 'nombre' => 'Tecnologías de la información', 'descripcion' => 'Desarrollo, soporte y administración de sistemas', 'activo' => true, 'habilidades' => 5, 'vacantes' => 1];
    }

    /** El ejemplo de HabilidadAdmin del contrato. */
    private function habilidad(array $cambios = []): array
    {
        return $cambios + ['id' => 3, 'nombre' => 'SQL', 'categoria' => ['id' => 1, 'nombre' => 'Tecnologías de la información'], 'activo' => true, 'candidatos' => 1, 'vacantes' => 1];
    }

    /** El ejemplo de CatalogoAdmin del contrato (un ajuste). */
    private function ajuste(array $cambios = []): array
    {
        return $cambios + ['id' => 6, 'nombre' => 'Intérprete de Lengua de Señas Mexicana', 'activo' => true, 'en_uso' => 0, 'descripcion' => 'Intérprete de LSM en reuniones y capacitaciones', 'categoria' => 'auditiva'];
    }

    private function conAdministrador(array $respuestas)
    {
        Http::fake(['*/auth/me' => Http::response(['id' => 1, 'correo' => 'admin@inclutec.mx', 'nombre' => 'Admin', 'apellidos' => 'IncluTec', 'telefono' => null, 'rol' => 'administrador', 'estado' => 'activo', 'empresa' => null, 'consentimiento_sensibles' => null])] + $respuestas);

        return $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN]);
    }

    private function error(string $codigo, string $detail, array $campos = []): array
    {
        return ['detail' => $detail, 'codigo' => $codigo] + ($campos ? ['campos' => $campos] : []);
    }

    private function paginaHabilidades(array $items, ?int $total = null): array
    {
        return ['items' => $items, 'total' => $total ?? count($items), 'page' => 1, 'size' => 25];
    }

    // --- WEB-06 ---

    public function test_las_categorias_piden_get_admin_categorias_con_la_busqueda_y_el_token(): void
    {
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
        $html = $this->conAdministrador([
            '*/admin/categorias*' => Http::response([$this->categoria()]),
            '*/admin/habilidades*' => Http::response($this->paginaHabilidades([], 15)),
        ])->get('/habilidades?q=tecno')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/categorias') && $p->method() === 'GET' && $p->data() === ['q' => 'tecno'] && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('Tecnologías de la información', $html);
        $this->assertStringContainsString('5 habilidades · 1 vacante', $html);
        $this->assertMatchesRegularExpression('/Habilidades <span class="pestana-total">\(15\)<\/span>/', $html);
    }

    public function test_las_habilidades_piden_busqueda_categoria_y_pagina(): void
    {
        $html = $this->conAdministrador([
            '*/admin/categorias*' => Http::response([$this->categoria()]),
            '*/admin/habilidades*' => Http::response($this->paginaHabilidades([$this->habilidad()], 15)),
        ])->get('/habilidades?seccion=habilidades&q=sql&categoria_id=1&page=1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/habilidades?') && $p->data() === ['q' => 'sql', 'categoria_id' => 1, 'page' => 1, 'size' => 25]);
        $this->assertStringContainsString('1 candidato · 1 vacante', $html);
        $this->assertMatchesRegularExpression('/SQL<\/td>\s*<td>Tecnologías de la información<\/td>/', $html);
    }

    public function test_crear_una_categoria_envia_post_con_el_cuerpo_del_contrato(): void
    {
        $this->conAdministrador(['*/admin/categorias' => Http::response($this->categoria(['id' => 6, 'nombre' => 'Salud y bienestar', 'habilidades' => 0, 'vacantes' => 0]), 201)])
            ->post('/catalogo/categorias', ['nombre' => 'Salud y bienestar', 'descripcion' => 'Atención y apoyo en servicios de salud'])->assertRedirect();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/categorias' && $p->method() === 'POST' && $p->data() === ['nombre' => 'Salud y bienestar', 'descripcion' => 'Atención y apoyo en servicios de salud']);
    }

    public function test_crear_y_editar_una_habilidad_envian_nombre_y_categoria(): void
    {
        $this->conAdministrador(['*/admin/habilidades*' => Http::response($this->habilidad(['id' => 16, 'nombre' => 'Power BI']), 201)])
            ->post('/catalogo/habilidades', ['nombre' => 'Power BI', 'categoria_id' => '1'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/habilidades' && $p->method() === 'POST' && $p->data() === ['nombre' => 'Power BI', 'categoria_id' => 1]);

        $this->conAdministrador(['*/admin/habilidades/3' => Http::response($this->habilidad())])->put('/catalogo/habilidades/3', ['nombre' => 'SQL', 'categoria_id' => '1'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/habilidades/3' && $p->method() === 'PUT');
    }

    public function test_activar_y_desactivar_envian_patch_con_activo(): void
    {
        $this->conAdministrador(['*/admin/categorias/1' => Http::response($this->categoria(['activo' => false]))])->patch('/catalogo/categorias/1/activo', ['activo' => '0'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/categorias/1' && $p->method() === 'PATCH' && $p->data() === ['activo' => false]);

        $this->conAdministrador(['*/admin/habilidades/3' => Http::response($this->habilidad())])->patch('/catalogo/habilidades/3/activo', ['activo' => '1'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/habilidades/3' && $p->method() === 'PATCH' && $p->data() === ['activo' => true]);
    }

    public function test_eliminar_envia_delete_y_el_204_no_trae_cuerpo(): void
    {
        $this->conAdministrador(['*/admin/categorias/6' => Http::response('', 204)])->delete('/catalogo/categorias/6', ['nombre' => 'Salud y bienestar'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/categorias/6' && $p->method() === 'DELETE');

        $this->get('/habilidades')->assertSee($this->enAvisos('Se eliminó «Salud y bienestar».'), false);
    }

    // --- WEB-07 ---

    public function test_el_catalogo_pide_get_admin_catalogos_tipo_y_agrupa_los_ajustes(): void
    {
        $html = $this->conAdministrador(['*/admin/catalogos/ajustes' => Http::response([$this->ajuste(), $this->ajuste(['id' => 12, 'nombre' => 'Horario flexible', 'categoria' => 'general', 'descripcion' => 'Posibilidad de ajustar horarios de entrada y salida', 'en_uso' => 3])])])
            ->get('/catalogos?tipo=ajustes')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/catalogos/ajustes' && $p->method() === 'GET' && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertMatchesRegularExpression('/<h3 id="grupo-auditiva".*?Intérprete de Lengua de Señas Mexicana.*?<h3 id="grupo-general".*?Horario flexible.*?3 registros/s', $html);
        $this->assertStringContainsString('Sin uso', $html);
    }

    public function test_cada_tipo_pide_su_propia_ruta(): void
    {
        foreach (['modalidades', 'jornadas', 'tipos-contrato', 'niveles-educativos', 'sectores', 'tamanos-empresa', 'motivos-reporte'] as $tipo) {
            $this->conAdministrador(["*/admin/catalogos/{$tipo}" => Http::response([['id' => 1, 'nombre' => 'Uno', 'activo' => true, 'en_uso' => 1, 'orden' => 1, 'rango' => '1 a 10', 'aplica_a' => 'todos']])])
                ->get("/catalogos?tipo={$tipo}")->assertOk();
            Http::assertSent(fn (Request $p) => $p->url() === "http://localhost:8000/api/v1/admin/catalogos/{$tipo}");
        }
    }

    public function test_crear_un_ajuste_envia_nombre_descripcion_y_categoria(): void
    {
        $this->conAdministrador(['*/admin/catalogos/ajustes' => Http::response($this->ajuste(['id' => 14]), 201)])
            ->post('/catalogo/ajustes', ['nombre' => 'Lector de pantalla instalado', 'descripcion' => 'Equipos con NVDA o JAWS ya instalados', 'categoria' => 'visual'])->assertRedirect();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/catalogos/ajustes' && $p->method() === 'POST'
            && $p->data() === ['nombre' => 'Lector de pantalla instalado', 'categoria' => 'visual', 'descripcion' => 'Equipos con NVDA o JAWS ya instalados']);
    }

    public function test_los_campos_propios_de_cada_tipo_viajan_en_su_tipo(): void
    {
        $this->conAdministrador(['*/admin/catalogos/niveles-educativos' => Http::response(['id' => 7, 'nombre' => 'Maestría', 'activo' => true, 'en_uso' => 0, 'orden' => 7], 201)])
            ->post('/catalogo/niveles-educativos', ['nombre' => 'Maestría', 'orden' => '7']);
        Http::assertSent(fn (Request $p) => $p->data() === ['nombre' => 'Maestría', 'orden' => 7]);

        $this->conAdministrador(['*/admin/catalogos/tamanos-empresa/2' => Http::response(['id' => 2, 'nombre' => 'Pequeña', 'activo' => true, 'en_uso' => 1, 'rango' => '11 a 50 trabajadores'])])
            ->put('/catalogo/tamanos-empresa/2', ['nombre' => 'Pequeña', 'rango' => '11 a 50 trabajadores']);
        Http::assertSent(fn (Request $p) => $p->method() === 'PUT' && $p->url() === 'http://localhost:8000/api/v1/admin/catalogos/tamanos-empresa/2' && $p->data() === ['nombre' => 'Pequeña', 'rango' => '11 a 50 trabajadores']);

        $this->conAdministrador(['*/admin/catalogos/motivos-reporte' => Http::response(['id' => 7, 'nombre' => 'Acoso', 'activo' => true, 'en_uso' => 0, 'aplica_a' => 'candidato'], 201)])
            ->post('/catalogo/motivos-reporte', ['nombre' => 'Acoso', 'aplica_a' => 'candidato']);
        Http::assertSent(fn (Request $p) => $p->data() === ['nombre' => 'Acoso', 'aplica_a' => 'candidato']);
    }

    public function test_activar_y_eliminar_de_un_catalogo_general_usan_su_ruta(): void
    {
        $this->conAdministrador(['*/admin/catalogos/jornadas/2' => Http::response(['id' => 2, 'nombre' => 'Medio tiempo', 'activo' => false, 'en_uso' => 2])])
            ->patch('/catalogo/jornadas/2/activo', ['activo' => '0'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/catalogos/jornadas/2' && $p->method() === 'PATCH' && $p->data() === ['activo' => false]);

        $this->conAdministrador(['*/admin/catalogos/jornadas/2' => Http::response('', 204)])->delete('/catalogo/jornadas/2', ['nombre' => 'Medio tiempo'])->assertRedirect();
        Http::assertSent(fn (Request $p) => $p->method() === 'DELETE' && $p->url() === 'http://localhost:8000/api/v1/admin/catalogos/jornadas/2');
    }

    // --- Errores del contrato ---

    public function test_409_nombre_duplicado_se_marca_en_el_campo_nombre_y_reabre_la_ventana(): void
    {
        $this->conAdministrador(['*/admin/catalogos/sectores' => Http::response($this->error('nombre_duplicado', 'Ya existe un elemento con ese nombre en el catálogo.'), 409)])
            ->from('/catalogos?tipo=sectores')->post('/catalogo/sectores', ['nombre' => 'Salud', 'modal' => 'catalogo-nuevo'])->assertRedirect('/catalogos?tipo=sectores')
            ->assertSessionHasErrors(['nombre' => 'Ya existe un sector con ese nombre. Usa otro.'])->assertSessionHas('abrir_modal', 'catalogo-nuevo');
    }

    public function test_409_nombre_duplicado_al_editar_reabre_la_ventana_de_edicion(): void
    {
        $this->conAdministrador(['*/admin/habilidades/3' => Http::response($this->error('nombre_duplicado', 'Ya existe una habilidad con ese nombre.'), 409)])
            ->from('/habilidades?seccion=habilidades')->put('/catalogo/habilidades/3', ['nombre' => 'Python', 'categoria_id' => '1', 'modal' => 'catalogo-editar'])
            ->assertSessionHasErrors(['nombre' => 'Ya existe una habilidad con ese nombre. Usa otro.'])->assertSessionHas('abrir_modal', 'catalogo-editar');
    }

    public function test_422_del_api_marca_cada_campo(): void
    {
        $this->conAdministrador(['*/admin/catalogos/ajustes' => Http::response($this->error('validacion', 'Revisa los datos marcados.', ['descripcion' => 'Es obligatoria en ajustes.', 'categoria' => 'Elige una categoría.']), 422)])
            ->from('/catalogos')->post('/catalogo/ajustes', ['nombre' => 'Algo', 'categoria' => 'visual', 'descripcion' => 'x', 'modal' => 'catalogo-nuevo'])
            ->assertSessionHasErrors(['descripcion' => 'Es obligatoria en ajustes.', 'categoria' => 'Elige una categoría.']);
    }

    public function test_409_en_uso_al_eliminar_no_borra_y_ofrece_desactivar(): void
    {
        $this->conAdministrador(['*/admin/categorias/1' => Http::response($this->error('en_uso', 'La categoría está en uso; solo se puede desactivar.'), 409)])
            ->from('/habilidades')->delete('/catalogo/categorias/1', ['nombre' => 'Tecnologías de la información'])->assertRedirect('/habilidades')
            ->assertSessionHas('en_uso', ['clave' => 'categorias', 'id' => 1, 'nombre' => 'Tecnologías de la información']);
    }

    public function test_404_del_api_muestra_la_pantalla_de_error(): void
    {
        $this->conAdministrador(['*/admin/catalogos/jornadas/99' => Http::response($this->error('no_encontrado', 'El recurso no existe o no es visible para este usuario.'), 404)])
            ->put('/catalogo/jornadas/99', ['nombre' => 'X'])->assertStatus(404)->assertSee('El recurso no existe o no es visible para este usuario.');
    }

    public function test_401_cierra_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/catalogos/ajustes' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)])->get('/catalogos')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }

    public function test_403_muestra_el_error_sin_cerrar_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/catalogos/ajustes' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)])
            ->get('/catalogos')->assertStatus(403)->assertSee('El rol del usuario no tiene acceso a este endpoint.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_5xx_muestra_el_aviso_de_servicio_no_disponible(): void
    {
        $this->conAdministrador(['*/admin/catalogos/ajustes' => Http::response('', 500)])->get('/catalogos')->assertStatus(503)->assertSee('El servicio no está disponible; intenta más tarde.');
    }
}
