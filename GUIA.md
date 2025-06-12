# Guía de Chat with PDF 🗣️💬📄

Esta guía te ayudará a configurar, desplegar y utilizar la aplicación Chat with PDF, una herramienta de IA que te permite hacer preguntas a documentos PDF.

## Índice
- [Requisitos previos](#requisitos-previos)
- [Configuración inicial](#configuración-inicial)
- [Desarrollo local](#desarrollo-local)
- [Despliegue](#despliegue)
- [Uso de la aplicación](#uso-de-la-aplicación)
- [Solución de problemas comunes](#solución-de-problemas-comunes)

## Requisitos previos

Antes de comenzar, asegúrate de tener:

- **Node.js**: Versión 18 o superior
- **PNPM**: Como gestor de paquetes
- **Cuenta de Cloudflare**: Gratuita, necesaria para los servicios de IA y almacenamiento
- **Git**: Para clonar el repositorio (opcional)

## Configuración inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/RihanArfan/chat-with-pdf.git
cd chat-with-pdf
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Vincular con NuxtHub

Este paso es crucial para habilitar los modelos de IA en tu cuenta de Cloudflare:

```bash
npx nuxthub link
```

Durante este proceso:
- Deberás iniciar sesión en tu cuenta de Cloudflare
- Se creará un nuevo proyecto en NuxtHub
- Se vincularán automáticamente los servicios necesarios (AI, KV, etc.)

### 4. Configurar Supabase (opcional)

Si deseas utilizar Supabase para el almacenamiento de vectores:

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Crea un archivo `.env` en la raíz del proyecto
3. Añade las siguientes variables:

```
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_clave_de_supabase
```

## Desarrollo local

Para iniciar el servidor de desarrollo con conexión a los servicios remotos de Cloudflare:

```bash
pnpm dev --remote
```

La aplicación estará disponible en `http://localhost:3000`

## Despliegue

### Despliegue con NuxtHub CLI

Para desplegar la aplicación en tu cuenta de Cloudflare:

```bash
npx nuxthub deploy
```

Este comando:
- Desplegará tu instancia de Chat with PDF en tu cuenta de Cloudflare
- Aprovisionará un bucket de Cloudflare R2 para almacenamiento
- Te proporcionará un dominio gratuito `<tu-app>.nuxt.dev`

### Despliegue con GitHub Actions

También puedes configurar el despliegue automático mediante GitHub Actions:

1. Haz fork del repositorio
2. Configura los secretos `NUXT_HUB_PROJECT_KEY` y `NUXT_HUB_USER_TOKEN` en la configuración de tu repositorio
3. Cada push a la rama principal activará automáticamente el despliegue

## Uso de la aplicación

### Subir documentos

1. Accede a la aplicación en tu navegador
2. Haz clic en el botón "Subir PDF" en el panel lateral
3. Selecciona uno o varios archivos PDF
4. Espera a que se procesen los documentos (esto puede tomar unos minutos dependiendo del tamaño)

### Hacer preguntas

1. Una vez procesados los documentos, escribe tu pregunta en el campo de texto inferior
2. Presiona Enter o haz clic en el botón de enviar
3. La aplicación buscará en los documentos y generará una respuesta basada en el contenido relevante

### Ver contexto relevante

Para entender de dónde proviene la información:
1. Después de recibir una respuesta, aparecerá un botón "Ver contexto pertinente"
2. Al hacer clic, podrás ver qué partes de los documentos se utilizaron para generar la respuesta

## Solución de problemas comunes

### Error al vincular con NuxtHub

Si encuentras problemas al vincular con NuxtHub:
1. Asegúrate de tener una cuenta de Cloudflare activa
2. Verifica tu conexión a internet
3. Intenta ejecutar `npx nuxthub link --force` para forzar una nueva vinculación

### Problemas con la subida de documentos

Si los documentos no se procesan correctamente:
1. Verifica que el PDF no esté protegido con contraseña
2. Asegúrate de que el PDF contenga texto seleccionable (no imágenes de texto)
3. Intenta con un archivo más pequeño para descartar problemas de tamaño

### Respuestas incorrectas o irrelevantes

Si las respuestas no son precisas:
1. Intenta reformular tu pregunta para ser más específico
2. Verifica que el documento contenga la información que buscas
3. Considera dividir documentos muy grandes en partes más pequeñas

## Límites del plan gratuito de Cloudflare

- 100,000 solicitudes/día
- 10 GB de almacenamiento en Cloudflare R2
- 10,000 tokens diarios para Workers AI
- 30 millones de dimensiones vectoriales consultadas/mes
- 5 millones de dimensiones vectoriales almacenadas

## Recursos adicionales

- [Documentación de NuxtHub](https://hub.nuxt.com)
- [Documentación de Nuxt UI](https://ui.nuxt.com)
- [Documentación de Nuxt](https://nuxt.com)