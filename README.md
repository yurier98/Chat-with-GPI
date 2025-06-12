# Chat with PDF 🗣️💬📄

Chat with PDF es una aplicación completa basada en IA que te permite hacer preguntas a documentos PDF.

La aplicación se ejecuta con renderizado del lado del servidor en el borde utilizando Cloudflare Pages.

Puede implementarla sin necesidad de configuración en su cuenta de Cloudflare utilizando NuxtHub:

[![Deploy to NuxtHub](https://hub.nuxt.com/button.svg)](https://hub.nuxt.com/new?template=chat-with-pdf)

### 🚀 Key Features

- **Hybrid RAG**: Búsqueda híbrida RAG utilizando búsqueda de texto completo en Supabase y búsqueda vectorial en Supabase Vector
- **Respuestas en streaming**: La información se transmite en tiempo real a la interfaz de usuario mediante Server-Sent Events
- **Alto rendimiento**: Desplegado en el edge con renderizado del lado del servidor utilizando Cloudflare Pages y Supabase como backend

<!-- ### 🎥 See It in Action

https://github.com/Atinux/atidraw/assets/904724/85f79def-f633-40b7-97c2-3a8579e65af1

Ready to create? Visit [chat-with-pdf.nuxt.dev](https://chat-with-pdf.nuxt.dev) and share your best drawing! -->

## 🛠 Tech Stack

- [Nuxt](https://nuxt.com) - El framework intuitivo de Vue
- [Nuxt UI](https://github.com/nuxt/ui) - Hermosa biblioteca UI con TailwindCSS
- [Supabase](https://supabase.com) - Plataforma de backend como servicio
  - Almacenamiento de documentos PDF
  - Base de datos PostgreSQL para chunks de documentos
  - Búsqueda vectorial con pgvector para embeddings
- [unpdf](https://github.com/unjs/unpdf) - Versión agnóstica de plataforma de [PDF.js](https://github.com/mozilla/pdf.js) para entornos serverless
- [NuxtHub Rate Limit](https://github.com/fayazara/nuxthub-ratelimit) - Limitación de solicitudes
- [NuxtHub](https://hub.nuxt.com) - Construye y despliega en tu cuenta de Cloudflare sin configuración
  - [`hubAI()`](https://hub.nuxt.com/docs/features/ai) para ejecutar modelos de IA de Cloudflare para chat LLM y generación de embeddings
  - [`hubKV()`](https://hub.nuxt.com/docs/features/ai) para limitación de IP
- [`npx nuxthub deploy`](https://github.com/nuxt-hub/cli) - To deploy the app on your Cloudflare account for free

## 🔌 Configuración de Supabase

Esta aplicación utiliza Supabase como backend para:

1. **Almacenamiento**: Guardar los archivos PDF subidos
2. **Base de datos**: Almacenar chunks de documentos y sus metadatos
3. **Búsqueda vectorial**: Utiliza pgvector para búsquedas semánticas eficientes

### Estructura de la base de datos

La aplicación utiliza las siguientes tablas en Supabase:

- `documents`: Almacena metadatos de los documentos PDF
- `document_chunks`: Almacena fragmentos de texto extraídos de los PDFs
- `document_vectors`: Almacena los embeddings vectoriales para búsqueda semántica

### Configuración

Para conectar tu propia instancia de Supabase:

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta las migraciones SQL del directorio `supabase/migrations`
3. Configura las variables de entorno:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-clave-anon-key
SUPABASE_SERVICE_KEY=tu-clave-service-role
```

## 🏎️ ¿Cómo funciona?

![Hybrid Search RAG](./.github/hybrid-rag.png)

Este proyecto utiliza una combinación de búsqueda de texto completo clásica (sparse) contra Supabase PostgreSQL y búsqueda híbrida con embeddings contra Supabase Vector (dense) para proporcionar lo mejor de ambos mundos, ofreciendo el contexto más aplicable al LLM.

El funcionamiento es el siguiente:

1. Tomamos la entrada del usuario y la reescribimos en 5 consultas diferentes utilizando un LLM
2. Ejecutamos cada una de estas consultas contra nuestros dos almacenes de datos - Base de datos PostgreSQL de Supabase para búsqueda de texto completo y Supabase Vector para recuperación densa
3. Tomamos los resultados de ambos almacenes de datos y los fusionamos utilizando [Reciprocal Rank Fusion](https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html), lo que nos proporciona una única lista de resultados
4. Luego tomamos los 10 mejores resultados de esta lista y los pasamos al LLM para generar una respuesta

<sub>Credits: https://github.com/RafalWilinski/cloudflare-rag#hybrid-search-rag</sub>

## 🚀 Quick Start

1. Install dependencies with [pnpm](https://pnpm.io)
    ```bash
    pnpm install
    ```
2. Create & link a NuxtHub project to enable running AI models on your Cloudflare account
    ```bash
    npx nuxthub link
    ```
4. Deploy the application to your Cloudflare account
    ```bash
    npx nuxthub deploy
    ```
4. Launch the dev server
    ```bash
    pnpm dev --remote
    ```

Visit `http://localhost:3000` and start chatting with documents!

## 🌐 Deploy to the World for Free

Host your Chat with PDF instance on a **free Cloudflare account** and **free NuxtHub account**.

Deploy it online in the NuxtHub UI:

[![Deploy to NuxtHub](https://hub.nuxt.com/button.svg)](https://hub.nuxt.com/new?repo=RihanArfan/chat-with-pdf)

Or locally with the [NuxtHub CLI](https://github.com/nuxt-hub/cli):

```bash
npx nuxthub deploy
```

This command will deploy your Chat with PDF instance to your Cloudflare account and provision a Cloudflare R2 bucket. You will also get a free `<your-app>.nuxt.dev` domain.

What's included in Cloudflare free plan:
- 100,000 requests/day
- 10 GB storage on Cloudflare R2
- 10,000 tokens a day for Workers AI
- 30 million queried vector dimensions / month
- 5 million stored vector dimensions

Read more about the pricing on our [detailed pricing page](https://hub.nuxt.com/pricing).

You can also deploy using [Cloudflare Pages CI](https://hub.nuxt.com/docs/getting-started/deploy#cloudflare-pages-ci) or [GitHub actions](https://hub.nuxt.com/docs/getting-started/deploy#github-action).

### Remote Storage

Once your project is deployed, you can use [NuxtHub Remote Storage](https://hub.nuxt.com/docs/getting-started/remote-storage) to connect to your preview or production Cloudflare R2 bucket in development using the `--remote` flag:

```bash
pnpm dev --remote
```

## 🔗 Useful Links

- [Live Demo](https://chat-with-pdf.nuxt.dev)
- [NuxtHub Documentation](https://hub.nuxt.com)
- [Nuxt UI](https://ui.nuxt.com)
- [Nuxt](https://nuxt.com)

## 📝 License

Published under the [MIT license](./LICENSE).

## 🙋 Credits

- [cloudflare-rag](https://github.com/RafalWilinski/cloudflare-rag) by [Rafal Wilinski](https://github.com/RafalWilinski) - Chat with PDF is a port of the cloudflare-rag project to NuxtHub and Nuxt UI. The core logic and functionality are derived from cloudflare-rag, adapted to work with NuxtHub.
- [hub-chat](https://github.com/ra-jeev/hub-chat) by [Rajeev R Sharma](https://github.com/ra-jeev) - Parts of UI and inspiration for the streaming composable.
