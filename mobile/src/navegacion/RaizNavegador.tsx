import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CAN02DetalleVacante from '../pantallas/candidato/CAN02DetalleVacante';
import CAN04MiCV from '../pantallas/candidato/CAN04MiCV';
import CAN06DetallePostulacion from '../pantallas/candidato/CAN06DetallePostulacion';
import MOV00Splash from '../pantallas/compartidas/MOV00Splash';
import MOV01InicioSesion from '../pantallas/compartidas/MOV01InicioSesion';
import MOV02Registro from '../pantallas/compartidas/MOV02Registro';
import MOV03RecuperarContrasena from '../pantallas/compartidas/MOV03RecuperarContrasena';
import REC03CrearEditarVacante from '../pantallas/reclutador/REC03CrearEditarVacante';
import REC04Postulados from '../pantallas/reclutador/REC04Postulados';
import REC05DetallePostulado from '../pantallas/reclutador/REC05DetallePostulado';
import { useSesion } from '../sesion';
import AvisoPrivacidad from '../pantallas/compartidas/AvisoPrivacidad';
import { colores } from '../tema';
import { CandidatoTabs } from './CandidatoTabs';
import { ReclutadorTabs } from './ReclutadorTabs';
import { NoLeidasProvider } from './NoLeidasContext';
import type { RootStackParamList } from './tipos';

const Pila = createNativeStackNavigator<RootStackParamList>();

const opcionesEncabezado = {
  headerShown: true,
  headerTintColor: colores.primario,
  headerTitleStyle: { color: colores.texto },
} as const;

/** Elige qué se ve según la sesión: splash, acceso sin sesión o el navegador del rol. */
export function RaizNavegador() {
  const { estado, usuario, pantallaInicial } = useSesion();

  return (
    // La clave reinicia el contador al cambiar de usuario.
    <NoLeidasProvider key={usuario?.id ?? 'sin-sesion'} activo={estado === 'activa'}>
      <Pila.Navigator screenOptions={{ headerShown: false }}>
        {estado === 'cargando' ? (
          <Pila.Screen name="Splash" component={MOV00Splash} />
        ) : estado === 'sin_sesion' || !usuario ? (
          <>
            <Pila.Screen name="InicioSesion" component={MOV01InicioSesion} />
            <Pila.Screen
              name="Registro"
              component={MOV02Registro}
              options={{ ...opcionesEncabezado, title: 'Crear cuenta' }}
            />
            <Pila.Screen
              name="RecuperarContrasena"
              component={MOV03RecuperarContrasena}
              options={{ ...opcionesEncabezado, title: 'Recuperar contraseña' }}
            />
            <Pila.Screen
              name="AvisoPrivacidad"
              component={AvisoPrivacidad}
              options={{ ...opcionesEncabezado, title: 'Aviso de privacidad' }}
            />
          </>
        ) : usuario.rol === 'candidato' ? (
          <>
            <Pila.Screen
              name="CandidatoTabs"
              component={CandidatoTabs}
              initialParams={pantallaInicial === 'Perfil' ? { screen: 'Perfil' } : undefined}
            />
            <Pila.Screen
              name="DetalleVacante"
              component={CAN02DetalleVacante}
              options={{ ...opcionesEncabezado, title: 'Detalle de vacante' }}
            />
            <Pila.Screen
              name="MiCV"
              component={CAN04MiCV}
              options={{ ...opcionesEncabezado, title: 'Mi CV' }}
            />
            <Pila.Screen
              name="DetallePostulacion"
              component={CAN06DetallePostulacion}
              options={{ ...opcionesEncabezado, title: 'Detalle de postulación' }}
            />
          </>
        ) : (
          <>
            <Pila.Screen
              name="ReclutadorTabs"
              component={ReclutadorTabs}
              initialParams={
                pantallaInicial === 'Organizacion' ? { screen: 'Organizacion' } : undefined
              }
            />
            <Pila.Screen
              name="EditarVacante"
              component={REC03CrearEditarVacante}
              options={{ ...opcionesEncabezado, title: 'Vacante' }}
            />
            <Pila.Screen
              name="Postulados"
              component={REC04Postulados}
              options={{ ...opcionesEncabezado, title: 'Postulados' }}
            />
            <Pila.Screen
              name="DetallePostulado"
              component={REC05DetallePostulado}
              options={{ ...opcionesEncabezado, title: 'Detalle del postulado' }}
            />
          </>
        )}
      </Pila.Navigator>
    </NoLeidasProvider>
  );
}
