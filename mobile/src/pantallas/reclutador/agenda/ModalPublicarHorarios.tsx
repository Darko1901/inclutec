import { useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  empresas,
  horarios,
  type EstadoVacante,
  type VacanteReclutador,
} from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  Casilla,
  GrupoRadio,
  ModalFormulario,
  Selector,
  Texto,
} from '../../../componentes';
import { formatearDiaCorto, iniciarEnMexico } from '../../../utilidades/fechas';
import {
  DURACIONES,
  fechasConRepeticion,
  LIGA_VALIDA,
  MAX_DIAS_REPETIR,
  MENSAJE_LIGA,
  MENSAJE_TRASLAPE,
  opcionesDia,
  opcionesHora,
  type DuracionTexto,
} from './horarios';

interface Props {
  /** Vacante con la que se abre el formulario (por ejemplo, desde REC-05). */
  vacanteInicial?: number | null;
  onCerrar: () => void;
  /** Se publicó al menos un horario. */
  onPublicados: (publicados: number) => void;
}

type Campo = 'vacante' | 'dia' | 'hora' | 'liga';
type Errores = Partial<Record<Campo, string>>;

interface Resultado {
  publicados: number;
  fallidos: { fecha: string; mensaje: string }[];
}

const VACANTES_PUBLICADAS: EstadoVacante = 'publicada';

const OPCIONES_DURACION = DURACIONES.map((minutos) => ({
  valor: minutos,
  titulo: `${minutos} minutos`,
}));
const OPCIONES_DIAS_REPETIR = Array.from({ length: MAX_DIAS_REPETIR }, (_, i) => ({
  id: i + 1,
  nombre: i === 0 ? '1 día hábil' : `${i + 1} días hábiles`,
}));

/** Publicar uno o varios horarios de entrevista de una vacante (POST /horarios-entrevista). */
export function ModalPublicarHorarios({ vacanteInicial = null, onCerrar, onPublicados }: Props) {
  const [vacantes, setVacantes] = useState<VacanteReclutador[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [vacanteId, setVacanteId] = useState<number | null>(vacanteInicial);
  const [dia, setDia] = useState<number | null>(null);
  const [hora, setHora] = useState<number | null>(null);
  const [duracion, setDuracion] = useState<DuracionTexto>('45');
  const [liga, setLiga] = useState('');
  const [repetir, setRepetir] = useState(false);
  const [diasRepetir, setDiasRepetir] = useState(1);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const dias = useMemo(() => opcionesDia(), []);
  const horas = useMemo(() => opcionesHora(), []);

  useEffect(() => {
    let vigente = true;
    empresas
      .misVacantes({ estado: VACANTES_PUBLICADAS, size: 100 })
      .then((pagina) => {
        if (!vigente) return;
        setVacantes(pagina.items);
        // Con una sola vacante publicada no hace falta elegirla.
        if (pagina.items.length === 1) setVacanteId((actual) => actual ?? pagina.items[0].id);
      })
      .catch((fallo: unknown) => {
        if (vigente) setErrorCarga(ApiError.desde(fallo).detail);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const limpiar = (campo: Campo) => setErrores((previo) => ({ ...previo, [campo]: undefined }));

  function validar(): Errores {
    const encontrados: Errores = {};
    if (vacanteId === null)
      encontrados.vacante = 'Elige la vacante para la que publicas el horario.';
    if (dia === null) encontrados.dia = 'Elige el día de la entrevista.';
    if (hora === null) encontrados.hora = 'Elige la hora de inicio.';
    if (!LIGA_VALIDA.test(liga.trim())) encontrados.liga = MENSAJE_LIGA;
    if (dia !== null && hora !== null) {
      const inicio = new Date(iniciarEnMexico(dias[dia].fecha, hora)).getTime();
      if (inicio <= Date.now()) encontrados.hora = 'Elige una hora que aún no pase.';
    }
    return encontrados;
  }

  async function publicar() {
    setErrorGeneral(null);
    const encontrados = validar();
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const fechas = repetir
      ? fechasConRepeticion(dias[dia as number].fecha, diasRepetir)
      : [dias[dia as number].fecha];
    setEnviando(true);
    const salida: Resultado = { publicados: 0, fallidos: [] };
    const deApi: Errores = {};
    let general: string | null = null;
    for (const fecha of fechas) {
      try {
        await horarios.publicar({
          vacante_id: vacanteId as number,
          inicio: iniciarEnMexico(fecha, hora as number),
          duracion_min: Number(duracion) as 30 | 45 | 60,
          liga: liga.trim(),
        });
        salida.publicados += 1;
      } catch (fallo) {
        const error = ApiError.desde(fallo);
        const mensaje = error.codigo === 'horario_traslapado' ? MENSAJE_TRASLAPE : error.detail;
        salida.fallidos.push({ fecha, mensaje });
        // Errores de un campo (liga, vacante…) se marcan en su campo cuando se publica un solo horario.
        if (error.campos?.liga) deApi.liga = error.campos.liga;
        if (error.campos?.inicio) deApi.hora = error.campos.inicio;
        if (error.campos?.vacante_id) deApi.vacante = error.campos.vacante_id;
        general = mensaje;
      }
    }
    setEnviando(false);

    if (salida.publicados > 0) onPublicados(salida.publicados);
    if (salida.fallidos.length === 0) return onCerrar();
    if (fechas.length === 1) {
      setErrores(deApi);
      setErrorGeneral(Object.keys(deApi).length > 0 ? null : general);
      return;
    }
    setResultado(salida);
  }

  if (resultado) {
    return (
      <ModalFormulario
        titulo="Resultado de la publicación"
        onCerrar={onCerrar}
        accion={{ titulo: 'Listo', onPress: onCerrar }}
        testID="modal-resultado-horarios"
      >
        <Aviso
          variante={resultado.publicados > 0 ? 'advertencia' : 'error'}
          mensaje={`Se publicaron ${resultado.publicados} de ${resultado.publicados + resultado.fallidos.length} horarios.`}
          testID="resumen-publicacion"
        />
        <Texto variante="cuerpoFuerte" accessibilityRole="header">
          No se publicaron
        </Texto>
        {resultado.fallidos.map((f) => (
          <Texto key={f.fecha} testID={`fallido-${f.fecha}`}>
            {`${formatearDiaCorto(f.fecha)}: ${f.mensaje}`}
          </Texto>
        ))}
      </ModalFormulario>
    );
  }

  return (
    <ModalFormulario
      titulo="Publicar horarios"
      onCerrar={onCerrar}
      ocupado={enviando}
      pistaVolver="Cierra sin publicar"
      accion={{ titulo: 'Publicar', onPress: () => void publicar(), cargando: enviando }}
      testID="modal-publicar-horarios"
    >
      <Texto color="textoSecundarioSobreGris">
        Los candidatos en «Entrevista» podrán elegir uno de tus horarios libres. La hora es la de la
        Ciudad de México.
      </Texto>
      {errorCarga ? <Aviso variante="error" mensaje={errorCarga} /> : null}
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      {vacantes !== null && vacantes.length === 0 ? (
        <Aviso
          variante="advertencia"
          mensaje="No tienes vacantes publicadas. Publica una vacante para ofrecer horarios de entrevista."
        />
      ) : null}

      <Selector
        etiqueta="Vacante"
        placeholder="Elige la vacante"
        opciones={(vacantes ?? []).map(({ id, titulo }) => ({ id, nombre: titulo }))}
        valor={vacanteId}
        cargando={vacantes === null && errorCarga === null}
        onChange={(id) => {
          setVacanteId(id);
          limpiar('vacante');
        }}
        error={errores.vacante}
        testID="selector-vacante-horario"
      />
      <Selector
        etiqueta="Día"
        placeholder="Elige el día"
        opciones={dias.map(({ id, nombre, etiquetaAccesible }) => ({
          id,
          nombre,
          etiquetaAccesible,
        }))}
        valor={dia}
        onChange={(id) => {
          setDia(id);
          limpiar('dia');
          limpiar('hora');
        }}
        error={errores.dia}
        testID="selector-dia"
      />
      <Selector
        etiqueta="Hora de inicio"
        placeholder="Elige la hora"
        opciones={horas}
        valor={hora}
        onChange={(minutos) => {
          setHora(minutos);
          limpiar('hora');
        }}
        error={errores.hora}
        testID="selector-hora"
      />
      <GrupoRadio<DuracionTexto>
        etiqueta="Duración"
        opciones={OPCIONES_DURACION}
        valor={duracion}
        onCambio={setDuracion}
        testID="grupo-duracion"
      />
      <CampoTexto
        etiqueta="Liga de la videollamada"
        ayuda="Una liga genérica de Google Meet o de Microsoft Teams."
        value={liga}
        onChangeText={(texto) => {
          setLiga(texto);
          limpiar('liga');
        }}
        keyboardType="url"
        autoCapitalize="none"
        autoComplete="off"
        maxLength={255}
        error={errores.liga}
        testID="campo-liga"
      />
      <Casilla
        texto="Repetir en los siguientes días hábiles"
        ayuda="Publica el mismo horario de lunes a viernes después del día elegido."
        marcada={repetir}
        onCambio={setRepetir}
        testID="casilla-repetir"
      />
      {repetir ? (
        <Selector
          etiqueta="Cuántos días hábiles más"
          opciones={OPCIONES_DIAS_REPETIR}
          valor={diasRepetir}
          onChange={setDiasRepetir}
          testID="selector-dias-repetir"
        />
      ) : null}
      <Boton titulo="Cancelar" variante="texto" onPress={onCerrar} deshabilitado={enviando} />
    </ModalFormulario>
  );
}
