import { defineConfig } from 'prisma/config';

const databaseUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? 'postgresql://localhost:5432/peddiehacks';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
