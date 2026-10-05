# Contrato del API

| Archivo | Para qué sirve |
|---|---|
| [`contrato.md`](contrato.md) | Contrato legible: convenciones, reglas de negocio, los 100 endpoints con ejemplos y los objetos. |
| [`openapi.yaml`](openapi.yaml) | El mismo contrato en OpenAPI 3.1, para herramientas: visor en https://editor.swagger.io y generación de tipos con `openapi-typescript`. |

Los dos archivos se mantienen juntos: no se edita uno sin el otro. Si algo del contrato no alcanza al implementar, se reporta y se actualiza el contrato antes de cambiar el código.
