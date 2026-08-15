import { PrismaCatalogRepository } from '../apps/api/src/prisma-catalog-repository.js';
import { createPrismaClient } from '../apps/api/src/prisma-client.js';

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  console.error('Skipping Prisma smoke test: set DATABASE_URL or SUPABASE_DB_URL.');
  process.exit(0);
}

const database = createPrismaClient(databaseUrl);
try {
  const catalog = new PrismaCatalogRepository(database);
  const [referenceData, exercises] = await Promise.all([
    catalog.getReferenceData(),
    catalog.listExercises({ limit: 1 }),
  ]);
  if (referenceData.bodyRegions.length === 0 || exercises.data.length === 0) {
    throw new Error('Prisma smoke test found an empty catalog. Apply migrations and seed first.');
  }
  console.log(
    `Prisma smoke test passed: ${referenceData.bodyRegions.length} body regions, ${exercises.data.length} exercise page row.`,
  );
} finally {
  await database.$disconnect();
}
