import { defineConfig, react, tailwindcss } from '@untrustnova/nova-framework/config';

export default defineConfig({
  app: {
    name: process.env.NOVA_APP_NAME || '__APP_NAME__',
    url: process.env.NOVA_APP_URL || 'http://localhost:3000',
    env: process.env.NOVA_ENV || 'development',
    debug: process.env.NOVA_DEBUG === 'true',
  },
  server: {
    host: process.env.NOVA_HOST || '0.0.0.0',
    port: Number(process.env.NOVA_PORT || 3000),
  },
  security: {
    bodyLimit: 1024 * 1024,
  },
  kernel: {
    adapter: process.env.NOVA_KERNEL_ADAPTER || 'node',
  },
  database: {
    default: process.env.NOVA_DB_CONNECTION || 'sqlite',
    connections: {
      postgres: {
        driver: 'pg',
        url: process.env.NOVA_DATABASE_URL,
      },
      mysql: {
        driver: 'mysql2',
        url: process.env.NOVA_DATABASE_URL,
      },
      sqlite: {
        driver: 'better-sqlite3',
        url: process.env.NOVA_DATABASE_URL || 'file:./storage/db.sqlite',
      },
      mongodb: {
        driver: 'mongodb',
        url: process.env.NOVA_DATABASE_URL,
      },
      supabase: {
        driver: 'supabase',
        url: process.env.NOVA_DATABASE_URL,
      },
    },
  },
  modules: {
    storage: {
      driver: process.env.NOVA_STORAGE_DRIVER || 'local',
      disks: {
        local: { root: './storage/app' },
        s3: {
          bucket: process.env.NOVA_AWS_BUCKET,
          region: process.env.NOVA_AWS_REGION,
        },
        minio: {
          endPoint: process.env.NOVA_MINIO_ENDPOINT,
          accessKey: process.env.NOVA_MINIO_ACCESS_KEY,
          secretKey: process.env.NOVA_MINIO_SECRET_KEY,
        },
      },
    },
    cache: {
      driver: process.env.NOVA_CACHE_DRIVER || 'memory',
      stores: {
        memory: { max: 500 },
        redis: { url: process.env.NOVA_REDIS_URL },
      },
    },
    logs: {
      driver: 'paperlog',
      level: process.env.NOVA_LOG_LEVEL || 'info',
    },
  },
  frontend: {
    entry: './web/main.jsx',
    globals: './web/styles/globals.css',
  },
  plugins: [
    react(),
    tailwindcss({
      content: ['./web/**/*.{js,jsx}'],
    }),
  ],
  alias: {
    '@': './web',
    '@components': './web/components',
    '@lib': './web/lib',
  },
});
