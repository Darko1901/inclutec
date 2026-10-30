# Capturas de la app móvil

Aquí van las capturas de pantalla de la app, tomadas **en el iPhone con Expo Go** y el mock encendido (`EXPO_PUBLIC_USE_MOCK=true`). Todavía no hay ninguna: este archivo es la lista de lo que falta tomar. No se generan capturas con simuladores ni se editan: lo que se entrega es lo que se vio en el teléfono.

## Antes de empezar

1. Cierra Expo Go por completo y vuelve a abrir la app. Los datos del mock viven en memoria, así que cada apertura parte de los datos iniciales y las fechas son relativas a hoy (la entrevista de Mariana siempre queda dentro de 3 días).
2. Pon el teléfono en **vertical**, con el tamaño de letra normal, el brillo alto y sin modo oscuro (la app es solo clara).
3. Si quieres ocultar la barra de estado, activa el modo «No molestar» y deja la batería arriba del 50 %. No hay datos reales en ninguna cuenta: todas son de prueba (`Inclutec2026`).
4. Para capturar en iPhone con Face ID: botón lateral + subir volumen a la vez. Se guarda como PNG en Fotos.

## Cómo entregarlas

- Un archivo PNG por captura, con **el nombre exacto** de la columna «Archivo» (sin acentos ni espacios), dentro de esta carpeta.
- Sin recortes ni anotaciones. Si la pantalla es larga y no cabe, toma la captura con la parte más importante arriba (nombre de la pantalla y el estado que se pide).
- Las capturas de la lista son las mínimas; si algo no se ve bien, vuelve a tomarla con el mismo nombre.

## Lista de capturas (24)

| # | Archivo | Pantalla | Cuenta | Cómo dejarla |
|---|---|---|---|---|
| 1 | `MOV-00_Splash.png` | MOV-00 Splash | — | Abre la app y toma la captura antes de que termine de cargar (si pasa muy rápido, actívala con la grabación de pantalla y saca el cuadro). |
| 2 | `MOV-01_Inicio_de_sesion.png` | MOV-01 Inicio de sesión | Sin sesión | Pantalla vacía, con los campos «Correo» y «Contraseña», «¿Olvidaste tu contraseña?» y «Crear cuenta». |
| 3 | `MOV-02_Paso1_Tipo_de_cuenta.png` | MOV-02 Registro, paso 1 de 3 | Sin sesión | Toca «Crear cuenta»: se ven las dos tarjetas «Busco empleo» y «Represento a una empresa». |
| 4 | `MOV-03_Recuperar_contrasena.png` | MOV-03 Recuperar contraseña | Sin sesión | Toca «¿Olvidaste tu contraseña?»: paso 1 de 2 con el campo de correo. |
| 5 | `MOV-04_Notificaciones.png` | MOV-04 Notificaciones | `mariana.lopez@correo.mx` | Pestaña Notificaciones: la insignia de la pestaña dice 1 y la notificación «Tu postulación avanzó» aparece como no leída. |
| 6 | `CAN-01_Vacantes.png` | CAN-01 Vacantes | `mariana.lopez@correo.mx` | Pestaña Vacantes sin filtros: «Técnico de soporte de TI» con **88 %** y «Ya te postulaste». |
| 7 | `CAN-01_Filtros.png` | CAN-01 Filtros | `mariana.lopez@correo.mx` | Toca «Filtros»: la ventana con modalidad, categoría, entidad, jornada y compatibilidad mínima. |
| 8 | `CAN-02_Compatibilidad.png` | CAN-02 Detalle de vacante | `mariana.lopez@correo.mx` | Abre «Auxiliar de almacén»: se ve el título, el porcentaje de compatibilidad y su desglose con ✓ y ✕ en texto. Si no cabe, toma otra con la sección de accesibilidad (`CAN-02_Accesibilidad.png`). |
| 9 | `CAN-02_Accesibilidad.png` | CAN-02 Detalle de vacante | `mariana.lopez@correo.mx` | La misma vacante, desplazada hasta «El lugar cuenta con» y «La empresa puede ofrecer bajo solicitud». |
| 10 | `CAN-03_Mi_perfil.png` | CAN-03 Mi perfil | `mariana.lopez@correo.mx` | Pestaña Perfil: «Tu perfil está al 90 % · Falta: foto» con la barra de avance. |
| 11 | `CAN-03_Necesidades_de_ajuste.png` | CAN-03 Necesidades de ajuste | `mariana.lopez@correo.mx` | Expande «Necesidades de ajuste»: casillas por categoría y las tres opciones para compartir. |
| 12 | `CAN-04_Mi_CV.png` | CAN-04 Mi CV | `mariana.lopez@correo.mx` | Perfil › Mi CV, pestaña «Experiencia» con su experiencia registrada. |
| 13 | `CAN-05_Mis_postulaciones.png` | CAN-05 Mis postulaciones | `mariana.lopez@correo.mx` | Pestaña Postulaciones, «Activas (1)»: «Técnico de soporte de TI» con estado «Entrevista» y la fecha y hora de la entrevista. |
| 14 | `CAN-06_Entrevista.png` | CAN-06 Detalle de postulación | `mariana.lopez@correo.mx` | Abre esa postulación y baja hasta «Tu entrevista» con fecha, hora, liga y «Cancelar entrevista». |
| 15 | `CAN-06_Elige_un_horario.png` | CAN-06 Elige un horario | `mariana.lopez@correo.mx` | En la misma pantalla toca «Cancelar entrevista» › «Sí, cancelar entrevista»: aparece «Elige un horario» con los días agrupados y los botones «Agendar». |
| 16 | `CAN-06_Desde_notificacion.png` | CAN-06 desde una notificación | `mariana.lopez@correo.mx` | Cierra y abre la app otra vez (datos nuevos). En Notificaciones toca «Tu postulación avanzó»: el último paso del historial sale con borde y el texto «Desde tu notificación». |
| 17 | `CAN-07_Empresas.png` | CAN-07 Empresas | `mariana.lopez@correo.mx` | Pestaña Empresas: ConCentro, LogiBajío y TecnoQro con su número de vacantes. |
| 18 | `REC-01_Banner_pendiente.png` | REC-01 Organización (empresa pendiente) | `contacto@estudiotrazo.mx` | Entra con Daniel: llega a Organización con el banner «Estamos revisando tu empresa…» y «Subir constancia (PDF)». |
| 19 | `REC-02_Mis_vacantes.png` | REC-02 Mis vacantes | `rh@tecnoqro.mx` | Pestaña Mis vacantes con «Técnico de soporte de TI», «Desarrollador web junior» y «Diseñador gráfico» (borrador), cada una con «n postulados · m nuevos». |
| 20 | `REC-03_Paso4_Accesibilidad.png` | REC-03 Crear vacante, paso 4 de 4 | `rh@tecnoqro.mx` | «+ Nueva vacante» y avanza hasta el paso 4 (puedes capturarlo editando «Técnico de soporte de TI» desde ⋮ › Editar): los dos bloques «El lugar cuenta con» y «Podemos ofrecer bajo solicitud». |
| 21 | `REC-04_Postulados.png` | REC-04 Postulados | `rh@tecnoqro.mx` | Toca la tarjeta «Técnico de soporte de TI»: «28 postulados» ordenados por compatibilidad, con los chips de estado y la compatibilidad mínima. |
| 22 | `REC-05_Detalle_postulado.png` | REC-05 Detalle del postulado | `rh@tecnoqro.mx` | Desde Postulados abre a «Mariana López García»: compatibilidad laboral 83 %, desglose, necesidades y la entrevista con su liga. |
| 23 | `REC-06_Agenda.png` | REC-06 Agenda | `rh@tecnoqro.mx` | Pestaña Agenda: horarios agrupados por día, uno agendado (Mariana) y otros libres, con «+ Publicar horarios» abajo. |
| 24 | `REC-06_Desde_notificacion.png` | REC-06 desde una notificación | `rh@tecnoqro.mx` | Cierra y abre la app otra vez. En Notificaciones toca «Nueva entrevista»: la agenda se desplaza al horario de Mariana y lo marca con borde y «Desde tu notificación». |

> La cuenta de reclutador de TecnoQro es `rh@tecnoqro.mx` (Laura). La contraseña de todas las cuentas es `Inclutec2026`.

## Capturas de estados clave

Estas cuatro son las que más pesan en la demostración; si solo alcanza el tiempo para algunas, toma primero:

1. `REC-01_Banner_pendiente.png` (estado de la empresa).
2. `CAN-02_Compatibilidad.png` (compatibilidad con desglose).
3. `CAN-06_Elige_un_horario.png` (agendar entrevista).
4. `REC-04_Postulados.png` (postulados ordenados por compatibilidad).

## Para revisar antes de entregar

- [ ] 24 archivos PNG con los nombres exactos de la tabla.
- [ ] Ninguna captura muestra notificaciones del sistema, nombres o fotos de personas reales ni el teclado abierto (salvo que la pantalla lo pida).
- [ ] En todas se lee el texto de los estados (no solo color).
- [ ] `CAN-06_Desde_notificacion.png` y `REC-06_Desde_notificacion.png` muestran el texto «Desde tu notificación».
