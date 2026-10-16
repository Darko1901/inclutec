import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { EmpresaResumen } from '../../../api';
import { LogoEmpresa, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { resumenAccesibleEmpresa, textoVacantesActivas } from './textosEmpresa';

interface Props {
  empresa: EmpresaResumen;
  onPress: () => void;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/** Tarjeta del directorio: un solo elemento para el lector de pantalla, con todo su resumen. */
export function TarjetaEmpresa({ empresa, onPress }: Props) {
  return (
    <Tarjeta
      testID={`empresa-${empresa.id}`}
      onPress={onPress}
      accessibilityLabel={resumenAccesibleEmpresa(empresa)}
      accessibilityHint="Abre la ficha de la empresa"
    >
      <View style={estilos.fila}>
        <LogoEmpresa logoUrl={empresa.logo_url} nombre={empresa.nombre_comercial} />
        <View style={estilos.flexible}>
          <Texto variante="subtitulo" {...ocultar}>
            {empresa.nombre_comercial}
          </Texto>
          <View style={estilos.insignia} {...ocultar}>
            <Texto variante="pequeno" style={estilos.textoInsignia} {...ocultar}>
              ✓ Empresa validada
            </Texto>
          </View>
        </View>
      </View>
      <Texto variante="pequeno" {...ocultar}>
        {empresa.sector.nombre}
      </Texto>
      <View style={estilos.fila} {...ocultar}>
        <Ionicons name="briefcase-outline" size={18} color={colores.primario} {...ocultar} />
        <Texto variante="cuerpoFuerte" color="primario" {...ocultar}>
          {textoVacantesActivas(empresa.vacantes_publicadas)}
        </Texto>
      </View>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  flexible: { flex: 1, flexShrink: 1, gap: espaciado.xs },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaciado.xs,
    backgroundColor: colores.exitoFondo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: 999,
  },
  textoInsignia: { color: colores.exitoTexto, fontWeight: '600' },
});
