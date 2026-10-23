<?php

namespace Tests\Unit;

use App\Support\Estados;
use App\Support\Iconos;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Yaml\Yaml;
use Tests\TestCase;

class EstadosTest extends TestCase
{
    /** Textos de la tabla 3.4 de docs/diseno/pantallas.md. */
    private const TABLA_3_4 = [
        'postulacion' => ['postulada' => 'Postulada', 'en_revision' => 'En revisión', 'entrevista' => 'Entrevista', 'aceptada' => 'Aceptada', 'no_seleccionada' => 'No seleccionada', 'retirada' => 'Retirada'],
        'vacante' => ['borrador' => 'Borrador', 'publicada' => 'Publicada', 'pausada' => 'Pausada', 'cerrada' => 'Cerrada', 'suspendida' => 'Suspendida'],
        'empresa' => ['pendiente' => 'Pendiente de validación', 'validada' => 'Validada', 'rechazada' => 'Rechazada', 'suspendida' => 'Suspendida'],
        'entrevista' => ['agendada' => 'Agendada', 'realizada' => 'Realizada', 'no_asistio' => 'No asistió', 'cancelada' => 'Cancelada'],
        'horario' => ['libre' => 'Libre', 'agendado' => 'Agendado', 'cancelado' => 'Cancelado'],
        'reporte' => ['abierto' => 'Abierto', 'en_revision' => 'En revisión', 'resuelto' => 'Resuelto', 'descartado' => 'Descartado'],
        'usuario' => ['activo' => 'Activo', 'suspendido' => 'Suspendido', 'eliminado' => 'Eliminado'],
        'ajuste' => ['existente' => 'El lugar cuenta con', 'bajo_solicitud' => 'Podemos ofrecer bajo solicitud'],
        // No están en la tabla 3.4: WEB-06 dice «activa/inactiva» y WEB-07 usa el mismo patrón (el API manda `activo`).
        'categoria' => ['activo' => 'Activa', 'inactivo' => 'Inactiva'],
        'catalogo' => ['activo' => 'Activo', 'inactivo' => 'Inactivo'],
    ];

    /** Dónde guarda el contrato los valores de cada entidad. */
    private const ENUMS_DEL_CONTRATO = [
        'usuario' => [['UsuarioAdmin', 'properties', 'estado']],
        'empresa' => [['EmpresaAdmin', 'properties', 'estado']],
        'vacante' => [['VacanteAdmin', 'properties', 'estado']],
        'postulacion' => [['PostulacionDetalle', 'properties', 'estado']],
        'entrevista' => [['Entrevista', 'properties', 'estado']],
        'horario' => [['Horario', 'properties', 'estado']],
        'reporte' => [['ReporteAdmin', 'properties', 'estado']],
        'ajuste' => [
            ['VacanteDetalle', 'properties', 'ajustes', 'items', 'properties', 'tipo'],
            ['PostuladoDetalle', 'properties', 'necesidades', 'items', 'properties', 'estado'],
        ],
    ];

    private static ?array $contrato = null;

    private static function contrato(): array
    {
        return self::$contrato ??= Yaml::parseFile(base_path('../docs/api/openapi.yaml'));
    }

    /** @return array<string, array{0: string, 1: list<string>}> */
    public static function enumsDelContrato(): array
    {
        $casos = [];
        foreach (self::ENUMS_DEL_CONTRATO as $entidad => $rutas) {
            foreach ($rutas as $ruta) {
                $casos[$entidad.' · '.implode('.', $ruta)] = [$entidad, $ruta];
            }
        }

        return $casos;
    }

    #[DataProvider('enumsDelContrato')]
    public function test_cubre_cada_valor_del_contrato(string $entidad, array $ruta): void
    {
        $nodo = self::contrato()['components']['schemas'];
        foreach ($ruta as $llave) {
            $nodo = $nodo[$llave] ?? $this->fail('El contrato no tiene '.implode('.', $ruta));
        }
        $valores = $nodo['enum'] ?? $this->fail('Sin enum en '.implode('.', $ruta));

        $this->assertNotEmpty($valores);
        foreach ($valores as $valor) {
            $this->assertTrue(Estados::existe($entidad, (string) $valor), "Falta «{$valor}» en «{$entidad}».");
        }
    }

    public function test_los_textos_son_los_de_la_tabla_3_4(): void
    {
        foreach (self::TABLA_3_4 as $entidad => $textos) {
            foreach ($textos as $valor => $texto) {
                $this->assertSame($texto, Estados::de($entidad, $valor)['texto'], "{$entidad}.{$valor}");
            }
        }
    }

    public function test_cada_estado_tiene_texto_icono_y_variante_validos(): void
    {
        $total = 0;
        foreach (Estados::todos() as $entidad => $valores) {
            foreach ($valores as $valor => $estado) {
                $total++;
                $this->assertNotSame('', $estado['texto'], "{$entidad}.{$valor}");
                $this->assertContains($estado['variante'], Estados::VARIANTES, "{$entidad}.{$valor}");
                $this->assertContains($estado['icono'], Iconos::nombres(), "{$entidad}.{$valor}");
                $this->assertStringContainsString('<path', Iconos::svg($estado['icono']));
            }
        }
        $this->assertSame(36, $total);
    }

    public function test_los_estados_de_bd_que_no_existen_en_la_tabla_no_estan_en_el_mapa(): void
    {
        // «Bloqueado», «Revisión», «Aprobada», «Pública» y «Oculta» eran inventos del prototipo.
        foreach (['Bloqueado', 'bloqueado', 'Revisión', 'revision', 'Aprobada', 'aprobada', 'Pública', 'publica', 'Oculta', 'oculta'] as $valor) {
            foreach (Estados::entidades() as $entidad) {
                $this->assertFalse(Estados::existe($entidad, $valor), "{$entidad}.{$valor}");
            }
        }
    }

    public function test_pedir_un_estado_desconocido_falla_con_un_mensaje_claro(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Estados::de('empresa', 'aprobada');
    }

    public function test_iconos_desconocidos_fallan(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Iconos::svg('no-existe');
    }
}
