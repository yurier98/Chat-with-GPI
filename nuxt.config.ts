// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  // https://nuxt.com/modules
  modules: [
    '@nuxthub/core',
    '@nuxtjs/supabase',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@vueuse/nuxt',
    'nuxthub-ratelimit',
  ],

  components: [
    {
      path: '~/components',
    },
    {
      path: '~/components/common',
      pathPrefix: false,
    },
  ],

  // https://devtools.nuxt.com
  devtools: { enabled: true },

  // https://nuxt.com/docs/getting-started/upgrade#testing-nuxt-4
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2024-07-30',

  nitro: {
    experimental: {
      openAPI: true,
    },
  },

  // https://hub.nuxt.com/docs/getting-started/installation#options
  hub: {
    ai: true,
    blob: false,
    cache: true,
    database: false,
    kv: true,
    // vectorize: {
    //   documents: {
    //     dimensions: 1024,
    //     metric: 'euclidean',
    //     metadataIndexes: {
    //       sessionId: 'string',
    //     },
    //   },
    // },
  },

  // https://eslint.nuxt.com
  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
      },
    },
  },

  nuxtHubRateLimit: {
    routes: {
      '/api/*': {
        maxRequests: 20,
        intervalSeconds: 60,
      },
    },
  },

  // Configuración de Supabase
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/'],
      cookieRedirect: false,
    },
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
})
