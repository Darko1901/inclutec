import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RaizNavegador } from './src/navegacion';
import { SesionProvider } from './src/sesion';
import { colores } from './src/tema';

const temaNavegacion = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colores.primario,
    background: colores.fondoSuave,
    card: colores.fondo,
    text: colores.texto,
    border: colores.bordeSuave,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SesionProvider>
        <NavigationContainer theme={temaNavegacion}>
          <RaizNavegador />
          <StatusBar style="dark" />
        </NavigationContainer>
      </SesionProvider>
    </SafeAreaProvider>
  );
}
